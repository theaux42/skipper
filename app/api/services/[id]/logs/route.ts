
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { docker } from '@/lib/docker'
import { getSession } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'runtime'

    const service = await db.service.findUnique({
        where: { id },
        include: { project: true }
    })

    if (!service) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    if (session.role !== 'ADMIN' && service.project.ownerId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build/deployment logs from file
    if (type === 'build') {
        try {
            const logPath = path.join(process.cwd(), 'data', 'logs', `${id}.build.log`)
            const logs = await fs.readFile(logPath, 'utf-8').catch(() => '')
            return NextResponse.json({ logs })
        } catch {
            return NextResponse.json({ logs: '' })
        }
    }

    // Runtime logs from container
    if (!service.containerId) {
        return NextResponse.json({ logs: '' })
    }

    try {
        const container = docker.getContainer(service.containerId)
        const logsBuffer = await container.logs({
            stdout: true,
            stderr: true,
            tail: 100,
            timestamps: true
        }) as Buffer

        return NextResponse.json({ logs: logsBuffer.toString('utf-8') })

    } catch (error) {
        console.error('Error fetching logs:', error)
        return NextResponse.json({ logs: 'Failed to fetch logs' })
    }
}
