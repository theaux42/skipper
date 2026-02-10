
'use server'

import { db } from '@/lib/db'
import { docker } from '@/lib/docker'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteService(serviceId: string) {
    const service = await db.service.findUnique({
        where: { id: serviceId },
        include: { project: true }
    })

    if (!service) {
        return { success: false, error: 'Service not found' }
    }

    // Remove container if it exists
    if (service.containerId) {
        try {
            const container = docker.getContainer(service.containerId)
            // Inspect to see if it exists and is running
            const inspect = await container.inspect().catch(() => null)
            if (inspect) {
                if (inspect.State.Running) {
                    await container.stop()
                }
                await container.remove()
            }
        } catch (error) {
            console.error('Error removing container:', error)
            // Continue deleting from DB even if container removal fails?
            // Maybe warn?
        }
    }

    await db.service.delete({
        where: { id: serviceId }
    })

    revalidatePath(`/projects/${service.projectId}`)
    return { success: true }
}
