
'use server'

import { db } from '@/lib/db'
import { docker } from '@/lib/docker'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const deployImageSchema = z.object({
    projectId: z.string(),
    name: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Name must be lowercase, alphanumeric, and hyphens only'),
    image: z.string().min(1),
    env: z.string().optional(), // Key=Value\nKey=Value
})

export async function deployFromImage(formData: FormData) {
    const projectId = formData.get('projectId') as string
    const name = formData.get('name') as string
    const image = formData.get('image') as string // e.g. "nginx:alpine"
    const envRaw = formData.get('env') as string

    const validation = deployImageSchema.safeParse({ projectId, name, image, env: envRaw })

    if (!validation.success) {
        return { success: false, error: validation.error.message }
    }

    // Check if service name exists in project
    const existing = await db.service.findUnique({
        where: {
            projectId_name: {
                projectId,
                name
            }
        }
    })

    if (existing) {
        return { success: false, error: 'Service with this name already exists in project' }
    }

    // Create Service DTO
    const service = await db.service.create({
        data: {
            name,
            projectId,
            sourceType: 'IMAGE',
            imageName: image,
            status: 'STARTING',
        }
    })

    // Parse Env
    const envVars = []
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

    try {
        await new Promise((resolve, reject) => {
            docker.pull(image, (err: any, stream: any) => {
                if (err) return reject(err)
                docker.modem.followProgress(stream, onFinished, onProgress)

                function onFinished(err: any, output: any) {
                    if (err) return reject(err)
                    resolve(output)
                }

                function onProgress(event: any) {
                    // console.log(event)
                }
            })
        })

        // Create Container
        const container = await docker.createContainer({
            Image: image,
            name: `homelab-${projectId}-${name}`, // Unique name
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
                status: 'RUNNING'
            }
        })

    } catch (error: any) {
        console.error('Deploy failed:', error)
        await db.service.update({
            where: { id: service.id },
            data: { status: 'ERROR' }
        })
        return { success: false, error: `Deploy failed: ${error.message}` }
    }

    revalidatePath(`/projects/${projectId}`)
    redirect(`/projects/${projectId}/services/${service.id}`)
}
