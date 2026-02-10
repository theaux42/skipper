
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { exec } from 'child_process'
import util from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = util.promisify(exec)
const DATA_DIR = path.join(process.cwd(), 'data', 'compose')

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'runtime'

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (session.role !== 'ADMIN' && project.ownerId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Deploy logs from file
    if (type === 'deploy') {
        try {
            const logPath = path.join(process.cwd(), 'data', 'logs', `${projectId}.compose.log`)
            const logs = await fs.readFile(logPath, 'utf-8').catch(() => '')
            return NextResponse.json({ logs })
        } catch {
            return NextResponse.json({ logs: '' })
        }
    }

    // Runtime logs from docker compose
    try {
        const projectDir = path.join(DATA_DIR, projectId)

        function getComposeWorkDir(projectDir: string, gitComposePath?: string | null): string {
            if (gitComposePath) {
                return path.dirname(path.join(projectDir, gitComposePath))
            }
            return projectDir
        }

        const workDir = getComposeWorkDir(projectDir, project.gitComposePath)

        const { stdout, stderr } = await execAsync(
            `docker compose -p "homelab-${projectId}" logs --tail 200 --no-color 2>&1`,
            { cwd: workDir, maxBuffer: 1024 * 1024 }
        )

        return NextResponse.json({ logs: stdout || stderr || '' })
    } catch (e: any) {
        return NextResponse.json({ logs: e.message || 'Failed to fetch compose logs' })
    }
}
