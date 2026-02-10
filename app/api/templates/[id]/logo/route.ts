
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const META_PATH = path.join(process.cwd(), 'templates', 'meta.json')
const BLUEPRINTS_DIR = path.join(process.cwd(), 'templates', 'blueprints')

const MIME_TYPES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Lookup logo filename from meta.json
        const raw = await fs.readFile(META_PATH, 'utf-8')
        const templates = JSON.parse(raw) as any[]
        const template = templates.find((t: any) => t.id === id)

        if (!template || !template.logo) {
            return new NextResponse('Not found', { status: 404 })
        }

        const logoPath = path.join(BLUEPRINTS_DIR, id, template.logo)

        try {
            const fileBuffer = await fs.readFile(logoPath)
            const ext = path.extname(template.logo).toLowerCase()
            const contentType = MIME_TYPES[ext] || 'application/octet-stream'

            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=86400, immutable',
                },
            })
        } catch {
            return new NextResponse('Logo file not found', { status: 404 })
        }
    } catch (e: any) {
        return new NextResponse(e.message, { status: 500 })
    }
}
