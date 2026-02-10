
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'


export async function addEnvVar(formData: FormData) {
    const serviceId = formData.get('serviceId') as string
    const key = formData.get('key') as string
    const value = formData.get('value') as string

    if (!key || !value) return { success: false, error: 'Key and Value required' }

    // Check if key exists
    const existing = await db.envVariable.findFirst({
        where: { serviceId, key }
    })

    if (existing) {
        // Update
        await db.envVariable.update({
            where: { id: existing.id },
            data: { value }
        })
    } else {
        // Create
        await db.envVariable.create({
            data: { serviceId, key, value }
        })
    }

    // Fetch service to get projectId
    const service = await db.service.findUnique({
        where: { id: serviceId },
        select: { projectId: true }
    })

    if (service) {
        revalidatePath(`/projects/${service.projectId}/services/${serviceId}`)
    }

    return { success: true }
}

export async function deleteEnvVar(id: string, serviceId: string) {
    await db.envVariable.delete({ where: { id } })

    const service = await db.service.findUnique({
        where: { id: serviceId },
        select: { projectId: true }
    })

    if (service) {
        revalidatePath(`/projects/${service.projectId}/services/${serviceId}`)
    }

    return { success: true }
}
