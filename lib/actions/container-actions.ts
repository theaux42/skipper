
'use server'

import { db } from '@/lib/db'
import { docker } from '@/lib/docker'
import { revalidatePath } from 'next/cache'
import { deployService } from '@/lib/deployer'

export async function bulkContainerAction(serviceIds: string[], action: 'start' | 'stop' | 'delete') {
    let success = 0
    let failed = 0

    for (const id of serviceIds) {
        const service = await db.service.findUnique({ where: { id }, include: { project: true } })
        if (!service) { failed++; continue }

        try {
            if (action === 'delete') {
                if (service.containerId) {
                    const container = docker.getContainer(service.containerId)
                    const info = await container.inspect().catch(() => null)
                    if (info) {
                        if (info.State.Running) await container.stop().catch(() => { })
                        await container.remove().catch(() => { })
                    }
                }
                await db.service.delete({ where: { id } })
            } else if (service.containerId) {
                const container = docker.getContainer(service.containerId)
                if (action === 'start') {
                    await container.start()
                    await db.service.update({ where: { id }, data: { status: 'RUNNING' } })
                } else {
                    await container.stop()
                    await db.service.update({ where: { id }, data: { status: 'STOPPED' } })
                }
            }
            success++
        } catch {
            failed++
        }
    }

    revalidatePath('/containers')
    revalidatePath('/dashboard')
    return { success: true, affected: success, failed }
}

export async function rebuildService(serviceId: string) {
    const service = await db.service.findUnique({ where: { id: serviceId } })
    if (!service) return { success: false, error: 'Service not found' }

    try {
        await deployService(serviceId)
        revalidatePath('/containers')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
