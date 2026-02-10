
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { docker } from '@/lib/docker'
import { getSession } from '@/lib/auth'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { command } = await request.json()

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

    if (!service.containerId) {
        return NextResponse.json({ error: 'No container attached' }, { status: 400 })
    }

    try {
        const container = docker.getContainer(service.containerId)

        const exec = await container.exec({
            Cmd: ['sh', '-c', command],
            AttachStdout: true,
            AttachStderr: true,
        })

        const stream = await exec.start({ Detach: false, Tty: false })

        const output = await new Promise<string>((resolve, reject) => {
            let data = ''
            stream.on('data', (chunk: Buffer) => {
                // Docker exec streams have an 8-byte header per frame when TTY is false
                // We'll strip them by converting the whole thing and cleaning up
                data += chunk.toString('utf-8')
            })
            stream.on('end', () => resolve(data))
            stream.on('error', reject)
            // Timeout
            setTimeout(() => resolve(data), 10000)
        })

        return NextResponse.json({ output })

    } catch (error: any) {
        console.error('Exec error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
