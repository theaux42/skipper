
import { db } from '@/lib/db'
import { docker } from '@/lib/docker'
import { cloneOrPull, getServicePath } from '@/lib/git'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

async function appendLog(serviceId: string, message: string) {
    const logDir = path.join(process.cwd(), 'data', 'logs')
    await fs.mkdir(logDir, { recursive: true })
    const logPath = path.join(logDir, `${serviceId}.build.log`)
    await fs.appendFile(logPath, message + '\n')
}

async function clearLog(serviceId: string) {
    const logDir = path.join(process.cwd(), 'data', 'logs')
    await fs.mkdir(logDir, { recursive: true })
    const logPath = path.join(logDir, `${serviceId}.build.log`)
    await fs.writeFile(logPath, '')
}

export async function deployService(serviceId: string) {
    const service = await db.service.findUnique({
        where: { id: serviceId },
        include: { envVariables: true }
    })

    if (!service) {
        throw new Error('Service not found')
    }

    try {
        await clearLog(serviceId)
        await appendLog(serviceId, `# Deployment started at ${new Date().toISOString()}`)
        await appendLog(serviceId, `# Service: ${service.name}`)
        await appendLog(serviceId, '---')

        // Update status
        await db.service.update({
            where: { id: serviceId },
            data: { status: 'BUILDING' }
        })

        const { projectId, name, gitRepoUrl, gitBranch, sourceType } = service
        const targetDir = getServicePath(projectId, name)

        // 1. Prepare Source
        if (sourceType === 'GITHUB' && gitRepoUrl) {
            const branch = gitBranch || 'main'
            await appendLog(serviceId, `Step 1: Cloning ${gitRepoUrl} (branch: ${branch})...`)
            await cloneOrPull(gitRepoUrl, branch, projectId, name)
            await appendLog(serviceId, 'Step 1: DONE')
        }

        // 2. Prepare Environment Files
        const envContent = service.envVariables.map(e => `${e.key}=${e.value}`).join('\n')
        await fs.writeFile(path.join(targetDir, '.env'), envContent)

        // 3. Determine Build Strategy
        // Check for docker-compose.yml
        const composePath = path.join(targetDir, 'docker-compose.yml')
        const hasCompose = await fs.stat(composePath).then(() => true).catch(() => false)

        if (hasCompose) {
            await appendLog(serviceId, `Step 3: Deploying using Docker Compose...`)
            console.log(`Deploying ${name} using Docker Compose...`)
            // Use Docker Compose
            // We use the project name to isolate containers e.g. -p homelab-projectId-name
            const projectName = `homelab-${projectId}-${name}`.toLowerCase()

            // Down previous if exists (optional, up -d is usually smart)
            // await execAsync(`docker compose -f ${composePath} -p ${projectName} down`)

            // Up
            // Ensure they join the network? 
            // We usually want them in homelab-panel-net to be reachable by tunnel
            // We can enforce network in override or assume user adds it.
            // For now, let's just run it. If user doesn't define network, they can't be exposed easily via our internal DNS logic which assumes IP or container name alias in shared network.
            // BUT, if we use standard compose, we might not need to mess with networks if we use host networking or similar? No.
            // Best approach: User defines network `homelab-panel-net` external: true in their compose.
            // Or we append an override file.

            await appendLog(serviceId, `Running: docker compose up -d --build`)
            const { stdout: composeOut, stderr: composeErr } = await execAsync(`docker compose -f ${composePath} -p ${projectName} up -d --build`, { cwd: targetDir })
            if (composeOut) await appendLog(serviceId, composeOut)
            if (composeErr) await appendLog(serviceId, composeErr)

            // Get Container ID (first one?)
            // Compose might create multiple. We track the "main" one? 
            // Complex. For now, let's just mark as RUNNING.
            // We can try to list containers with label com.docker.compose.project=${projectName}

            await appendLog(serviceId, 'Successfully deployed with Docker Compose')

            await db.service.update({
                where: { id: serviceId },
                data: {
                    status: 'RUNNING',
                    updatedAt: new Date(),
                }
            })

        } else {
            await appendLog(serviceId, `Step 3: Building Docker image...`)
            console.log(`Deploying ${name} using Dockerfile...`)
            // Standard Docker Build
            const imageName = `homelab/${projectId}-${name}:latest`

            const stream = await docker.buildImage({
                context: targetDir,
                src: ['.']
            }, {
                t: imageName,
                dockerfile: 'Dockerfile'
            });

            await new Promise((resolve, reject) => {
                docker.modem.followProgress(stream, (err: Error | null, res: any) => {
                    if (err) return reject(err)
                    resolve(res)
                }, async (event: any) => {
                    const msg = event.stream || event.status || ''
                    if (msg.trim()) {
                        await appendLog(serviceId, msg.trimEnd())
                    }
                })
            })

            // Recreate Container
            if (service.containerId) {
                try {
                    const oldContainer = docker.getContainer(service.containerId)
                    await oldContainer.stop().catch(() => { })
                    await oldContainer.remove().catch(() => { })
                } catch (e: any) { }
            }

            const envVars = service.envVariables.map(e => `${e.key}=${e.value}`)

            const container = await docker.createContainer({
                Image: imageName,
                name: `homelab-${projectId}-${name}`,
                Env: envVars,
                HostConfig: {
                    NetworkMode: 'homelab-panel-net',
                    RestartPolicy: { Name: 'unless-stopped' }
                },
                Labels: {
                    'homelab.service.id': service.id,
                    'homelab.project.id': projectId
                }
            })

            await container.start()
            await appendLog(serviceId, 'Successfully deployed and started container')

            await db.service.update({
                where: { id: serviceId },
                data: {
                    containerId: container.id,
                    status: 'RUNNING',
                    imageName: imageName,
                    updatedAt: new Date()
                }
            })
        }

    } catch (error: any) {
        console.error('Deploy failed:', error)
        await appendLog(serviceId, `\nERROR: ${error.message}`)
        await db.service.update({
            where: { id: serviceId },
            data: { status: 'ERROR' }
        })
        throw error // Rethrow so async caller might log it (but they catch generic)
    }
}

