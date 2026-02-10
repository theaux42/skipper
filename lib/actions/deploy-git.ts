
'use server'

import { db } from '@/lib/db'
import { docker } from '@/lib/docker'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import os from 'os'
import simpleGit from 'simple-git'
// @ts-ignore
import { v4 as uuidv4 } from 'uuid'

const deployGitSchema = z.object({
    projectId: z.string(),
    name: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Name must be lowercase, alphanumeric, and hyphens only'),
    repoUrl: z.string().url(),
    branch: z.string().min(1),
    dockerfilePath: z.string().min(1),
    env: z.string().optional(),
})

export async function deployFromGit(formData: FormData) {
    const projectId = formData.get('projectId') as string
    const name = formData.get('name') as string
    const repoUrl = formData.get('repoUrl') as string
    const branch = formData.get('branch') as string
    const dockerfilePath = formData.get('dockerfilePath') as string
    const envRaw = formData.get('env') as string

    const validation = deployGitSchema.safeParse({ projectId, name, repoUrl, branch, dockerfilePath, env: envRaw })

    if (!validation.success) {
        return { success: false, error: validation.error.message }
    }

    // Check if service name exists
    const existing = await db.service.findUnique({
        where: { projectId_name: { projectId, name } }
    })

    if (existing) {
        return { success: false, error: 'Service with this name already exists in project' }
    }

    // Create Service Record
    const service = await db.service.create({
        data: {
            name,
            projectId,
            sourceType: 'GITHUB',
            // @ts-ignore
            gitRepoUrl: repoUrl,
            // @ts-ignore
            gitBranch: branch,
            // @ts-ignore
            gitDockerfilePath: dockerfilePath,
            status: 'BUILDING',
        }
    })

    // Parse Env
    const envVars: string[] = []
    if (envRaw) {
        const lines = envRaw.split('\n')
        for (const line of lines) {
            if (line.includes('=')) {
                const [key, ...rest] = line.split('=')
                const value = rest.join('=')
                if (key && value) {
                    envVars.push(`${key.trim()}=${value.trim()}`)
                    await db.envVariable.create({
                        data: {
                            key: key.trim(),
                            value: value.trim(),
                            serviceId: service.id
                        }
                    })
                }
            }
        }
    }

    // Background process for cloning and building
    (async () => {
        const tempDir = path.join(os.tmpdir(), `homelab-git-${uuidv4()}`)
        try {
            await fs.promises.mkdir(tempDir, { recursive: true })

            // Get Token
            const setting = await db.systemSetting.findUnique({ where: { key: 'GITHUB_TOKEN' } })
            let authRepoUrl = repoUrl
            if (setting?.value && repoUrl.includes('github.com')) {
                authRepoUrl = repoUrl.replace('https://', `https://${setting.value}@`)
            }

            console.log(`Cloning ${repoUrl} (branch: ${branch}) to ${tempDir}`)
            const git = simpleGit()
            await git.clone(authRepoUrl, tempDir, ['--branch', branch, '--depth', '1'])

            // Verify Dockerfile
            const fullDockerfilePath = path.join(tempDir, dockerfilePath)
            if (!fs.existsSync(fullDockerfilePath)) {
                throw new Error(`Dockerfile not found at ${dockerfilePath}`)
            }

            // Build Image
            const imageName = `homelab-${projectId}-${name}:latest`
            console.log(`Building image ${imageName}...`)

            const tarStream = await docker.buildImage({
                context: tempDir,
                src: [dockerfilePath, ...fs.readdirSync(tempDir).filter(f => f !== '.git')]
            }, {
                t: imageName,
                dockerfile: dockerfilePath
            })

            await new Promise((resolve, reject) => {
                docker.modem.followProgress(tarStream, (err: any, res: any) => {
                    if (err) return reject(err)
                    resolve(res)
                })
            })

            // Cleanup
            await fs.promises.rm(tempDir, { recursive: true, force: true })

            // Create Container
            const container = await docker.createContainer({
                Image: imageName,
                name: `homelab-${projectId}-${name}`,
                Env: envVars,
                HostConfig: {
                    NetworkMode: 'homelab-panel-net',
                    RestartPolicy: { Name: 'unless-stopped' },
                },
                Labels: {
                    'homelab.service.id': service.id,
                    'homelab.project.id': projectId
                }
            })

            await container.start()

            await db.service.update({
                where: { id: service.id },
                data: {
                    containerId: container.id,
                    status: 'RUNNING',
                    imageName: imageName
                }
            })

        } catch (error: any) {
            console.error('Git Deploy Failed:', error)
            await db.service.update({
                where: { id: service.id },
                data: { status: 'ERROR' }
            })
            // Cleanup temp dir if exists
            try { await fs.promises.rm(tempDir, { recursive: true, force: true }) } catch { }
        }
    })()

    revalidatePath(`/projects/${projectId}`)
    redirect(`/projects/${projectId}/services/${service.id}`)
}
