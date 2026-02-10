
'use server'

import { db } from '@/lib/db'
import { docker } from '@/lib/docker'
import { revalidatePath } from 'next/cache'

export async function serviceAction(serviceId: string, action: 'start' | 'stop' | 'restart') {
    const service = await db.service.findUnique({
        where: { id: serviceId },
        include: { project: true }
    })

    if (!service || !service.containerId) {
        return { success: false, error: 'Service or Container not found' }
    }

    const container = docker.getContainer(service.containerId)

    try {
        if (action === 'start') {
            await container.start()
            await db.service.update({
                where: { id: serviceId },
                data: { status: 'RUNNING' }
            })
        } else if (action === 'stop') {
            await container.stop()
            await db.service.update({
                where: { id: serviceId },
                data: { status: 'STOPPED' }
            })
        } else if (action === 'restart') {
            await container.restart()
            await db.service.update({
                where: { id: serviceId },
                data: { status: 'RUNNING' }
            })
        }

        revalidatePath(`/projects/${service.projectId}/services/${serviceId}`)
        return { success: true }
    } catch (error: any) {
        console.error(`Failed to ${action} service:`, error)
        return { success: false, error: error.message }
    }
}
