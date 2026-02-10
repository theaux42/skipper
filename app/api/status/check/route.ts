
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exposedUrls = await db.exposedUrl.findMany({
        include: { service: true }
    })

    const results = await Promise.allSettled(
        exposedUrls.map(async (url) => {
            const target = `https://${url.fullUrl}`
            try {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 5000)
                const res = await fetch(target, {
                    method: 'HEAD',
                    signal: controller.signal,
                    redirect: 'follow',
                })
                clearTimeout(timeout)
                return {
                    id: url.id,
                    url: url.fullUrl,
                    serviceName: url.service?.name ?? 'unknown',
                    reachable: res.ok || res.status < 500,
                    statusCode: res.status,
                }
            } catch {
                return {
                    id: url.id,
                    url: url.fullUrl,
                    serviceName: url.service?.name ?? 'unknown',
                    reachable: false,
                    statusCode: 0,
                }
            }
        })
    )

    const checks = results.map(r => r.status === 'fulfilled' ? r.value : {
        id: '',
        url: 'unknown',
        serviceName: 'unknown',
        reachable: false,
        statusCode: 0,
    })

    return NextResponse.json({ checks })
}
