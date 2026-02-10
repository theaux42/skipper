
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'
import { exec, spawn } from 'child_process'
import util from 'util'
import { parseComposeFile } from '@/lib/compose-parser'
import simpleGit from 'simple-git'

const execAsync = util.promisify(exec)

const DATA_DIR = path.join(process.cwd(), 'data', 'compose')
const LOG_DIR = path.join(process.cwd(), 'data', 'logs')

async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true })
        await fs.mkdir(LOG_DIR, { recursive: true })
    } catch { }
}

async function appendDeployLog(projectId: string, message: string) {
    try {
        await fs.appendFile(path.join(LOG_DIR, `${projectId}.compose.log`), message + '\n')
    } catch { }
}

async function clearDeployLog(projectId: string) {
    try {
        await fs.writeFile(path.join(LOG_DIR, `${projectId}.compose.log`), '')
    } catch { }
}

/** Runs a shell command and streams stdout/stderr line-by-line to the deploy log. 
 *  Returns the full output. Doesn't throw on non-zero exit — returns the exit code instead. */
function execWithLogs(command: string, cwd: string, projectId: string): Promise<{ code: number | null; output: string }> {
    return new Promise((resolve) => {
        const child = spawn('sh', ['-c', command], { cwd })
        let output = ''

        const handleData = (data: Buffer) => {
            const text = data.toString()
            output += text
            appendDeployLog(projectId, text.trimEnd())
        }

        child.stdout.on('data', handleData)
        child.stderr.on('data', handleData)

        child.on('close', (code) => {
            resolve({ code, output })
        })

        child.on('error', (err) => {
            output += err.message
            appendDeployLog(projectId, `Process error: ${err.message}`)
            resolve({ code: 1, output })
        })
    })
}

/** Get the working directory for docker compose commands.
 *  If the project was cloned from git, use the directory containing the compose file.
 *  Otherwise use the project root dir. */
function getComposeWorkDir(projectDir: string, gitComposePath?: string | null): string {
    if (gitComposePath) {
        const dir = path.dirname(path.join(projectDir, gitComposePath))
        return dir
    }
    return projectDir
}

/** Clone (or re-clone) a git repo into the project directory */
export async function cloneRepoForProject(projectId: string) {
    await ensureDataDir()

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project || !project.gitRepoUrl) {
        return { success: false, error: 'No git repository configured' }
    }

    const projectDir = path.join(DATA_DIR, projectId)

    try {
        // Clean existing directory for a fresh clone
        await fs.rm(projectDir, { recursive: true, force: true }).catch(() => { })
        await fs.mkdir(projectDir, { recursive: true })

        // Get Token
        const setting = await db.systemSetting.findUnique({ where: { key: 'GITHUB_TOKEN' } })
        let authRepoUrl = project.gitRepoUrl
        if (setting?.value && project.gitRepoUrl.includes('github.com')) {
            authRepoUrl = project.gitRepoUrl.replace('https://', `https://${setting.value}@`)
        }

        console.log(`Cloning ${project.gitRepoUrl} into ${projectDir}`)
        const git = simpleGit()
        await git.clone(authRepoUrl, projectDir, ['--branch', project.gitBranch || 'main', '--depth', '1'])

        // Read compose content from the cloned repo
        const composePath = path.join(projectDir, project.gitComposePath || 'docker-compose.yml')
        let composeContent: string | null = null
        if (await fs.stat(composePath).catch(() => false)) {
            composeContent = await fs.readFile(composePath, 'utf-8')
            await db.project.update({
                where: { id: projectId },
                data: { composeContent }
            })
        }

        // Read .env if it exists next to the compose file
        const envPath = path.join(path.dirname(composePath), '.env')
        if (await fs.stat(envPath).catch(() => false)) {
            const envContent = await fs.readFile(envPath, 'utf-8')
            await db.project.update({
                where: { id: projectId },
                // @ts-ignore
                data: { envContent }
            })
        }

        revalidatePath(`/projects/${projectId}`)
        return { success: true, composeContent }
    } catch (e: any) {
        console.error('Git clone failed:', e)
        return { success: false, error: e.message }
    }
}

export async function deployComposeProject(projectId: string, composeContent: string, envContent: string = '') {
    await ensureDataDir()

    try {
        await clearDeployLog(projectId)
        await appendDeployLog(projectId, `[${new Date().toISOString()}] Starting deployment...`)

        // Update project with content
        await db.project.update({
            where: { id: projectId },
            data: {
                type: 'COMPOSE',
                composeContent,
                // @ts-ignore
                envContent
            }
        })

        const projectDir = path.join(DATA_DIR, projectId)
        await fs.mkdir(projectDir, { recursive: true })

        const project = await db.project.findUnique({ where: { id: projectId } })

        // If project has a git repo, re-clone to get latest
        if (project?.gitRepoUrl) {
            await appendDeployLog(projectId, `Cloning repository ${project.gitRepoUrl}...`)
            const cloneResult = await cloneRepoForProject(projectId)
            if (!cloneResult.success) {
                await appendDeployLog(projectId, `ERROR: Git clone failed: ${cloneResult.error}`)
                throw new Error(`Git clone failed: ${cloneResult.error}`)
            }
            await appendDeployLog(projectId, 'Repository cloned successfully.')
            // Use the compose content from the repo
            if (cloneResult.composeContent) {
                composeContent = cloneResult.composeContent
            }
        } else {
            // No git repo — write compose file + .env directly
            await fs.writeFile(path.join(projectDir, 'docker-compose.yml'), composeContent)
            await fs.writeFile(path.join(projectDir, '.env'), envContent || '')
        }

        // Determine the working directory for docker compose
        const workDir = getComposeWorkDir(projectDir, project?.gitComposePath)

        // Run docker compose up and stream output to log
        await appendDeployLog(projectId, '\n--- docker compose up --build ---')
        const result = await execWithLogs(
            `docker compose -p "homelab-${projectId}" up -d --build --remove-orphans 2>&1`,
            workDir,
            projectId
        )

        if (result.code !== 0) {
            throw new Error(`docker compose up exited with code ${result.code}`)
        }

        // Sync services with DB
        const parsed = parseComposeFile(composeContent)

        for (const svc of parsed.services) {
            const serviceName = svc.name

            let containerId = null
            try {
                const { stdout } = await execAsync(`docker compose -p "homelab-${projectId}" ps -q ${serviceName}`, { cwd: workDir })
                containerId = stdout.trim() || null
            } catch { }

            await db.service.upsert({
                where: {
                    projectId_name: {
                        projectId,
                        name: serviceName
                    }
                },
                create: {
                    projectId,
                    name: serviceName,
                    sourceType: 'COMPOSE_RAW',
                    status: 'RUNNING',
                    containerId,
                    isComposeService: true
                },
                update: {
                    status: 'RUNNING',
                    containerId,
                    isComposeService: true,
                    updatedAt: new Date()
                }
            })
        }

        await appendDeployLog(projectId, `\n[${new Date().toISOString()}] Deployment completed successfully.`)
        revalidatePath(`/projects/${projectId}`)
        return { success: true }
    } catch (e: any) {
        console.error('Compose deploy error:', e)
        await appendDeployLog(projectId, `\nERROR: ${e.message}`)
        return { success: false, error: e.message }
    }
}

// ── Stack Management Actions ──────────────────────────────────────────

async function getProjectWorkDir(projectId: string) {
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) throw new Error('Project not found')
    const projectDir = path.join(DATA_DIR, projectId)
    return { project, workDir: getComposeWorkDir(projectDir, project.gitComposePath) }
}

async function syncServiceStatuses(projectId: string, status: string) {
    const services = await db.service.findMany({ where: { projectId, isComposeService: true } })
    for (const svc of services) {
        await db.service.update({
            where: { id: svc.id },
            data: { status, updatedAt: new Date() }
        })
    }
    revalidatePath(`/projects/${projectId}`)
}

export async function composeStart(projectId: string) {
    try {
        const { workDir } = await getProjectWorkDir(projectId)
        await execAsync(`docker compose -p "homelab-${projectId}" start`, { cwd: workDir })
        await syncServiceStatuses(projectId, 'RUNNING')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function composeStop(projectId: string) {
    try {
        const { workDir } = await getProjectWorkDir(projectId)
        await execAsync(`docker compose -p "homelab-${projectId}" stop`, { cwd: workDir })
        await syncServiceStatuses(projectId, 'STOPPED')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function composeRestart(projectId: string) {
    try {
        const { workDir } = await getProjectWorkDir(projectId)
        await execAsync(`docker compose -p "homelab-${projectId}" restart`, { cwd: workDir })
        await syncServiceStatuses(projectId, 'RUNNING')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function composeRebuild(projectId: string) {
    try {
        await ensureDataDir()
        await clearDeployLog(projectId)
        await appendDeployLog(projectId, `[${new Date().toISOString()}] Starting rebuild...`)

        const { project, workDir } = await getProjectWorkDir(projectId)

        // If git repo, re-clone first
        if (project.gitRepoUrl) {
            await appendDeployLog(projectId, `Cloning repository ${project.gitRepoUrl}...`)
            const cloneResult = await cloneRepoForProject(projectId)
            if (!cloneResult.success) {
                await appendDeployLog(projectId, `ERROR: Git pull failed: ${cloneResult.error}`)
                return { success: false, error: `Git pull failed: ${cloneResult.error}` }
            }
            await appendDeployLog(projectId, 'Repository cloned successfully.')
        }

        await appendDeployLog(projectId, '\n--- docker compose up --build ---')
        const result = await execWithLogs(
            `docker compose -p "homelab-${projectId}" up -d --build --remove-orphans 2>&1`,
            workDir,
            projectId
        )

        if (result.code !== 0) {
            throw new Error(`docker compose up exited with code ${result.code}`)
        }

        // Refresh container IDs
        const services = await db.service.findMany({ where: { projectId, isComposeService: true } })
        for (const svc of services) {
            let containerId = null
            try {
                const { stdout } = await execAsync(`docker compose -p "homelab-${projectId}" ps -q ${svc.name}`, { cwd: workDir })
                containerId = stdout.trim() || null
            } catch { }
            await db.service.update({
                where: { id: svc.id },
                data: { status: 'RUNNING', containerId, updatedAt: new Date() }
            })
        }

        await appendDeployLog(projectId, `\n[${new Date().toISOString()}] Rebuild completed successfully.`)
        revalidatePath(`/projects/${projectId}`)
        return { success: true }
    } catch (e: any) {
        await appendDeployLog(projectId, `\nERROR: ${e.message}`)
        return { success: false, error: e.message }
    }
}

export async function composeDown(projectId: string) {
    try {
        const { workDir } = await getProjectWorkDir(projectId)
        await execAsync(`docker compose -p "homelab-${projectId}" down`, { cwd: workDir })
        await syncServiceStatuses(projectId, 'STOPPED')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
