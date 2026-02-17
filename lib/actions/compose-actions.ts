
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'
import { exec, spawn } from 'child_process'
import util from 'util'
import { parseComposeFile } from '@/lib/compose-parser'
import simpleGit from 'simple-git'
import { injectNetworkConfig } from '@/lib/template-engine'
import { docker } from '@/lib/docker'

const execAsync = util.promisify(exec)

const DATA_DIR = path.join(process.cwd(), 'data', 'compose')
const LOG_DIR = path.join(process.cwd(), 'data', 'logs')

async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true })
        await fs.mkdir(LOG_DIR, { recursive: true })
    } catch { }
}

/** Ensure the shared Docker network exists */
async function ensureNetwork() {
    try {
        await docker.getNetwork('skipper-net').inspect()
    } catch {
        try {
            await docker.createNetwork({ Name: 'skipper-net', Driver: 'bridge' })
            console.log('[Network] Created skipper-net network')
        } catch (e: any) {
            // May already exist due to race condition, that's fine
            if (!e.message?.includes('already exists')) {
                console.error('[Network] Failed to create skipper-net:', e.message)
            }
        }
    }
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

        // Pre-create / mark all services as DEPLOYING before we start
        const preParsed = parseComposeFile(composeContent)
        for (const svc of preParsed.services) {
            await db.service.upsert({
                where: { projectId_name: { projectId, name: svc.name } },
                create: {
                    projectId,
                    name: svc.name,
                    sourceType: 'COMPOSE_RAW',
                    status: 'DEPLOYING',
                    isComposeService: true
                },
                update: {
                    status: 'DEPLOYING',
                    isComposeService: true,
                    updatedAt: new Date()
                }
            })
        }
        revalidatePath(`/projects/${projectId}`)

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
            // No git repo — write compose file + .env directly (network injection happens below)
            await fs.writeFile(path.join(projectDir, 'docker-compose.yml'), composeContent)
            await fs.writeFile(path.join(projectDir, '.env'), envContent || '')
        }

        // Determine the working directory for docker compose
        const workDir = getComposeWorkDir(projectDir, project?.gitComposePath)

        // Inject network isolation for all compose projects
        const finalContent = injectNetworkConfig(composeContent, projectId)

        // Write the network-injected content
        if (!project?.gitRepoUrl) {
            await fs.writeFile(path.join(projectDir, 'docker-compose.yml'), finalContent)
            await fs.writeFile(path.join(projectDir, '.env'), envContent || '')
        } else {
            // For git repos, overwrite the compose file with injected content
            const composePath = path.join(projectDir, project.gitComposePath || 'docker-compose.yml')
            await fs.writeFile(composePath, finalContent)
            // @ts-ignore
            await fs.writeFile(path.join(projectDir, '.env'), project.envContent || '')
        }

        // Ensure the shared network exists
        await ensureNetwork()

        // Run docker compose up and stream output to log
        await appendDeployLog(projectId, '\n--- docker compose up --build ---')
        const result = await execWithLogs(
            `docker compose -p "skipper-${projectId}" up -d --build --remove-orphans 2>&1`,
            workDir,
            projectId
        )

        if (result.code !== 0) {
            // Mark all services as ERROR since the overall compose up failed
            const errorParsed = parseComposeFile(composeContent)
            for (const svc of errorParsed.services) {
                let containerId = null
                try {
                    const { stdout } = await execAsync(`docker compose -p "skipper-${projectId}" ps -q ${svc.name}`, { cwd: workDir })
                    containerId = stdout.trim() || null
                } catch { }
                await db.service.upsert({
                    where: { projectId_name: { projectId, name: svc.name } },
                    create: {
                        projectId,
                        name: svc.name,
                        sourceType: 'COMPOSE_RAW',
                        status: containerId ? 'RUNNING' : 'ERROR',
                        containerId,
                        isComposeService: true
                    },
                    update: {
                        status: containerId ? 'RUNNING' : 'ERROR',
                        containerId,
                        isComposeService: true,
                        updatedAt: new Date()
                    }
                })
            }
            const errorLog = result.output.length > 500 ? result.output.slice(-500) : result.output
            await appendDeployLog(projectId, `\nERROR: docker compose up exited with code ${result.code}`)
            revalidatePath(`/projects/${projectId}`)
            return { success: false, error: `docker compose up exited with code ${result.code}. Log: ${errorLog}` }
        }

        // Sync services with DB — check each service individually
        const parsed = parseComposeFile(composeContent)

        for (const svc of parsed.services) {
            const serviceName = svc.name

            let containerId = null
            let serviceStatus = 'ERROR'
            try {
                const { stdout } = await execAsync(`docker compose -p "skipper-${projectId}" ps -q ${serviceName}`, { cwd: workDir })
                containerId = stdout.trim() || null
                if (containerId) {
                    // Check if the container is actually running
                    const { stdout: stateOut } = await execAsync(`docker inspect --format '{{.State.Status}}' ${containerId}`)
                    const state = stateOut.trim()
                    serviceStatus = (state === 'running' || state === 'restarting') ? 'RUNNING' : 'ERROR'
                }
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
                    status: serviceStatus,
                    containerId,
                    isComposeService: true
                },
                update: {
                    status: serviceStatus,
                    containerId,
                    isComposeService: true,
                    updatedAt: new Date()
                }
            })
        }

        // Remove stale services that are no longer in the compose file
        const parsedNames = parsed.services.map(s => s.name)
        await db.service.deleteMany({
            where: {
                projectId,
                isComposeService: true,
                name: { notIn: parsedNames }
            }
        })

        await appendDeployLog(projectId, `\n[${new Date().toISOString()}] Deployment completed successfully.`)
        revalidatePath(`/projects/${projectId}`)
        return { success: true }
    } catch (e: any) {
        console.error('Compose deploy error:', e)
        await appendDeployLog(projectId, `\nERROR: ${e.message}`)
        // Mark all services as ERROR on unhandled exception
        try {
            await db.service.updateMany({
                where: { projectId, isComposeService: true, status: 'DEPLOYING' },
                data: { status: 'ERROR' }
            })
        } catch { }
        revalidatePath(`/projects/${projectId}`)
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
    const { workDir } = await getProjectWorkDir(projectId)
    const services = await db.service.findMany({ where: { projectId, isComposeService: true } })
    for (const svc of services) {
        let containerId = svc.containerId
        try {
            const { stdout } = await execAsync(`docker compose -p "skipper-${projectId}" ps -q ${svc.name}`, { cwd: workDir })
            containerId = stdout.trim() || null
        } catch { }
        await db.service.update({
            where: { id: svc.id },
            data: { status, containerId, updatedAt: new Date() }
        })
    }
    revalidatePath(`/projects/${projectId}`)
}

export async function composeStart(projectId: string) {
    try {
        const { workDir } = await getProjectWorkDir(projectId)
        await execAsync(`docker compose -p "skipper-${projectId}" start`, { cwd: workDir })
        await syncServiceStatuses(projectId, 'RUNNING')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function composeStop(projectId: string) {
    try {
        const { workDir } = await getProjectWorkDir(projectId)
        await execAsync(`docker compose -p "skipper-${projectId}" stop`, { cwd: workDir })
        await syncServiceStatuses(projectId, 'STOPPED')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function composeRestart(projectId: string) {
    try {
        const { workDir } = await getProjectWorkDir(projectId)
        await execAsync(`docker compose -p "skipper-${projectId}" restart`, { cwd: workDir })
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

        // Mark all services as DEPLOYING before we start
        const preParsed = parseComposeFile(project.composeContent || '')
        for (const svc of preParsed.services) {
            await db.service.upsert({
                where: { projectId_name: { projectId, name: svc.name } },
                create: {
                    projectId,
                    name: svc.name,
                    sourceType: 'COMPOSE_RAW',
                    status: 'DEPLOYING',
                    isComposeService: true
                },
                update: { status: 'DEPLOYING', updatedAt: new Date() }
            })
        }
        revalidatePath(`/projects/${projectId}`)

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

        // Inject network isolation
        let composeContent = project.composeContent
        if (composeContent) {
            const finalContent = injectNetworkConfig(composeContent, projectId)
            const projectDir = path.join(DATA_DIR, projectId)
            await fs.mkdir(projectDir, { recursive: true })
            const composePath = path.join(
                projectDir,
                project.gitComposePath || 'docker-compose.yml'
            )
            await fs.writeFile(composePath, finalContent)

            // Write .env file (empty if not present)
            // @ts-ignore
            await fs.writeFile(path.join(projectDir, '.env'), project.envContent || '')
        }

        // Ensure the shared network exists
        await ensureNetwork()

        const result = await execWithLogs(
            `docker compose -p "skipper-${projectId}" up -d --build --remove-orphans 2>&1`,
            workDir,
            projectId
        )

        if (result.code !== 0) {
            const errorLog = result.output.length > 500 ? result.output.slice(-500) : result.output
            // Check each service — some may have started OK, others failed
            const errParsed = parseComposeFile(project.composeContent || '')
            for (const svc of errParsed.services) {
                let containerId = null
                let svcStatus = 'ERROR'
                try {
                    const { stdout } = await execAsync(`docker compose -p "skipper-${projectId}" ps -q ${svc.name}`, { cwd: workDir })
                    containerId = stdout.trim() || null
                    if (containerId) {
                        const { stdout: stateOut } = await execAsync(`docker inspect --format '{{.State.Status}}' ${containerId}`)
                        svcStatus = (stateOut.trim() === 'running' || stateOut.trim() === 'restarting') ? 'RUNNING' : 'ERROR'
                    }
                } catch { }
                await db.service.upsert({
                    where: { projectId_name: { projectId, name: svc.name } },
                    create: { projectId, name: svc.name, sourceType: 'COMPOSE_RAW', status: svcStatus, containerId, isComposeService: true },
                    update: { status: svcStatus, containerId, updatedAt: new Date() }
                })
            }
            await appendDeployLog(projectId, `\nERROR: docker compose up exited with code ${result.code}`)
            revalidatePath(`/projects/${projectId}`)
            return { success: false, error: `docker compose up exited with code ${result.code}. Log: ${errorLog}` }
        }

        // Sync services with DB — check each service individually
        const parsed = parseComposeFile(project.composeContent || '')
        for (const svc of parsed.services) {
            let containerId = null
            let serviceStatus = 'ERROR'
            try {
                const { stdout } = await execAsync(`docker compose -p "skipper-${projectId}" ps -q ${svc.name}`, { cwd: workDir })
                containerId = stdout.trim() || null
                if (containerId) {
                    const { stdout: stateOut } = await execAsync(`docker inspect --format '{{.State.Status}}' ${containerId}`)
                    const state = stateOut.trim()
                    serviceStatus = (state === 'running' || state === 'restarting') ? 'RUNNING' : 'ERROR'
                }
            } catch { }
            await db.service.upsert({
                where: {
                    projectId_name: {
                        projectId,
                        name: svc.name
                    }
                },
                create: {
                    projectId,
                    name: svc.name,
                    sourceType: 'COMPOSE_RAW',
                    status: serviceStatus,
                    containerId,
                    isComposeService: true
                },
                update: {
                    status: serviceStatus,
                    containerId,
                    isComposeService: true,
                    updatedAt: new Date()
                }
            })
        }

        // Remove stale services that are no longer in the compose file
        const parsedNames = parsed.services.map(s => s.name)
        await db.service.deleteMany({
            where: {
                projectId,
                isComposeService: true,
                name: { notIn: parsedNames }
            }
        })

        await appendDeployLog(projectId, `\n[${new Date().toISOString()}] Rebuild completed successfully.`)
        revalidatePath(`/projects/${projectId}`)
        return { success: true }
    } catch (e: any) {
        await appendDeployLog(projectId, `\nERROR: ${e.message}`)
        try {
            await db.service.updateMany({
                where: { projectId, isComposeService: true, status: 'DEPLOYING' },
                data: { status: 'ERROR' }
            })
        } catch { }
        revalidatePath(`/projects/${projectId}`)
        return { success: false, error: e.message }
    }
}

export async function composeDown(projectId: string) {
    try {
        const { workDir } = await getProjectWorkDir(projectId)
        await execAsync(`docker compose -p "skipper-${projectId}" down`, { cwd: workDir })
        await syncServiceStatuses(projectId, 'STOPPED')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/** Save compose content to DB + disk and sync service records without deploying */
export async function saveComposeContent(projectId: string, composeContent: string, envContent: string = '') {
    try {
        await ensureDataDir()

        await db.project.update({
            where: { id: projectId },
            data: {
                type: 'COMPOSE',
                composeContent,
                // @ts-ignore
                envContent: envContent || undefined
            }
        })

        // Write files to disk so they're ready when user clicks Deploy
        const projectDir = path.join(DATA_DIR, projectId)
        await fs.mkdir(projectDir, { recursive: true })

        const finalContent = injectNetworkConfig(composeContent, projectId)
        await fs.writeFile(path.join(projectDir, 'docker-compose.yml'), finalContent)
        await fs.writeFile(path.join(projectDir, '.env'), envContent || '')

        // Parse compose and sync service records
        const parsed = parseComposeFile(composeContent)
        for (const svc of parsed.services) {
            await db.service.upsert({
                where: { projectId_name: { projectId, name: svc.name } },
                create: {
                    projectId,
                    name: svc.name,
                    sourceType: 'COMPOSE_RAW',
                    status: 'STOPPED',
                    isComposeService: true
                },
                update: {
                    isComposeService: true,
                    updatedAt: new Date()
                    // Don't change status — service may already be RUNNING
                }
            })
        }

        // Remove stale services no longer in the compose file
        const parsedNames = parsed.services.map(s => s.name)
        await db.service.deleteMany({
            where: {
                projectId,
                isComposeService: true,
                name: { notIn: parsedNames }
            }
        })

        revalidatePath(`/projects/${projectId}`)
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
