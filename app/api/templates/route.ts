
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const META_PATH = path.join(process.cwd(), 'templates', 'meta.json')

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search')?.toLowerCase() || ''
        const tag = searchParams.get('tag')?.toLowerCase() || ''

        const raw = await fs.readFile(META_PATH, 'utf-8')
        let templates = JSON.parse(raw) as any[]

        if (search) {
            templates = templates.filter((t: any) =>
                t.name.toLowerCase().includes(search) ||
                t.description.toLowerCase().includes(search) ||
                t.id.toLowerCase().includes(search) ||
                (t.tags || []).some((tg: string) => tg.toLowerCase().includes(search))
            )
        }

        if (tag) {
            templates = templates.filter((t: any) =>
                (t.tags || []).some((tg: string) => tg.toLowerCase() === tag)
            )
        }

        return NextResponse.json(templates)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
