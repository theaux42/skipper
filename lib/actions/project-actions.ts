
'use server'

import { db } from '@/lib/db'
import { docker } from '@/lib/docker'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cloneRepoForProject } from '@/lib/actions/compose-actions'

export async function createProject(formData: FormData) {
    const session = await getSession()
    if (!session) throw new Error('Unauthorized')

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const type = formData.get('type') as string || 'STANDARD'

    if (!name) throw new Error('Name is required')

    const gitRepoUrl = formData.get('gitRepoUrl') as string
    const gitBranch = formData.get('gitBranch') as string
    const gitComposePath = formData.get('gitComposePath') as string

    const project = await db.project.create({
        data: {
            name,
            description: description || null,
            ownerId: session.userId,
            type,
            // @ts-ignore
            gitRepoUrl: gitRepoUrl || null,
            // @ts-ignore
            gitBranch: gitBranch || null,
            // @ts-ignore
            gitComposePath: gitComposePath || null
        }
    })

    // For COMPOSE projects with a git repo, clone immediately
    if (type === 'COMPOSE' && gitRepoUrl) {
        const result = await cloneRepoForProject(project.id)
        if (!result.success) {
            console.error('Failed to clone repo at project creation:', result.error)
        }
    }

    revalidatePath('/dashboard')
    redirect(`/projects/${project.id}`)
}

export async function renameProject(projectId: string, newName: string) {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    if (!newName.trim()) return { success: false, error: 'Name required' }

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) return { success: false, error: 'Project not found' }
    if (session.role !== 'ADMIN' && project.ownerId !== session.userId) {
        return { success: false, error: 'Forbidden' }
    }

    await db.project.update({
        where: { id: projectId },
        data: { name: newName.trim() }
    })

    revalidatePath('/dashboard')
    return { success: true }
}

export async function deleteProject(projectId: string) {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const project = await db.project.findUnique({
        where: { id: projectId },
        include: { services: true }
    })
    if (!project) return { success: false, error: 'Project not found' }
    if (session.role !== 'ADMIN' && project.ownerId !== session.userId) {
        return { success: false, error: 'Forbidden' }
    }

    // Stop and remove all containers
    for (const service of project.services) {
        if (service.containerId) {
            try {
                const container = docker.getContainer(service.containerId)
                const info = await container.inspect().catch(() => null)
                if (info) {
                    if (info.State.Running) await container.stop().catch(() => { })
                    await container.remove().catch(() => { })
                }
            } catch { }
        }
    }

    await db.project.delete({ where: { id: projectId } })
    revalidatePath('/dashboard')
    return { success: true }
}

export async function toggleProjectServices(projectId: string, action: 'start' | 'stop') {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const project = await db.project.findUnique({
        where: { id: projectId },
        include: { services: true }
    })
    if (!project) return { success: false, error: 'Project not found' }
    if (session.role !== 'ADMIN' && project.ownerId !== session.userId) {
        return { success: false, error: 'Forbidden' }
    }

    let count = 0
    for (const service of project.services) {
        if (!service.containerId) continue
        try {
            const container = docker.getContainer(service.containerId)
            if (action === 'start') {
                await container.start()
                await db.service.update({ where: { id: service.id }, data: { status: 'RUNNING' } })
            } else {
                await container.stop()
                await db.service.update({ where: { id: service.id }, data: { status: 'STOPPED' } })
            }
            count++
        } catch { }
    }

    revalidatePath('/dashboard')
    revalidatePath(`/projects/${projectId}`)
    return { success: true, count }
}
