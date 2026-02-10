
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { docker } from '@/lib/docker'
import { getSession } from '@/lib/auth'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const service = await db.service.findUnique({
        where: { id },
        include: { project: true }
    })

    // Basic authorization: user must own project or be admin
    if (!service) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    if (session.role !== 'ADMIN' && service.project.ownerId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!service.containerId) {
        return NextResponse.json({ cpu: 0, memory: 0, status: service.status })
    }

    try {
        const container = docker.getContainer(service.containerId)
        const stats = await container.stats({ stream: false })

        // Parse stats
        // CPU % calculation is a bit complex in Docker API
        // https://docs.docker.com/engine/api/v1.41/#operation/ContainerStats
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
        const systemCpuDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
        const numberCpus = (stats.cpu_stats as any).online_cpus || 1 // Fallback

        let cpuPercent = 0
        if (systemCpuDelta > 0 && cpuDelta > 0) {
            cpuPercent = (cpuDelta / systemCpuDelta) * numberCpus * 100
        }

        const memoryUsage = stats.memory_stats.usage
        const memoryLimit = stats.memory_stats.limit
        const memoryPercent = (memoryUsage / memoryLimit) * 100

        return NextResponse.json({
            cpu: cpuPercent,
            memory: memoryUsage, // in bytes
            memoryLimit,
            memoryPercent,
            status: service.status
            // We might want to sync status here if it differs?
        })

    } catch (error) {
        console.error('Error fetching stats:', error)
        return NextResponse.json({ cpu: 0, memory: 0, status: 'ERROR' })
    }
}
