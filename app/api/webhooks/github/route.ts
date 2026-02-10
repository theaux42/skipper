
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
// import { deployServiceFromGit } from '@/lib/deployer' -> Removed, dynamic import used below

export async function POST(request: NextRequest) {
    try {
        const event = request.headers.get('x-github-event')
        if (event !== 'push') {
            return NextResponse.json({ message: 'Ignored event' }, { status: 200 })
        }

        const payload = await request.json()
        const { repository, ref } = payload

        // Ref is usually "refs/heads/main"
        // We can extract branch name
        const branch = ref.replace('refs/heads/', '')

        // Normalize repo URL
        // GitHub payload has clone_url: "https://github.com/user/repo.git"
        // We should match against what we stored.

        // Find services with matching repo
        // We might need fuzzy matching if user removed .git or used ssh?
        // For now try exact match on gitRepoUrl

        const services = await db.service.findMany({
            where: {
                sourceType: 'GITHUB',
                gitRepoUrl: repository.clone_url,
                gitBranch: branch
            }
        })

        if (services.length === 0) {
            console.log(`No services found for ${repository.clone_url} on branch ${branch}`)
            return NextResponse.json({ message: 'No matching services' }, { status: 200 })
        }

        console.log(`Found ${services.length} services to update for ${repository.full_name}`)

        const results = await Promise.allSettled(services.map(async (service: any) => {
            console.log(`Triggering deployment for ${service.name} (${service.id})`)
            if (service) {
                // Fire and forget deployment
                const { deployService } = await import('@/lib/deployer')
                deployService(service.id).catch(console.error)
            }
        }))

        const successCount = results.filter(r => r.status === 'fulfilled').length
        const failCount = results.filter(r => r.status === 'rejected').length

        return NextResponse.json({
            message: 'Deployment triggered',
            success: successCount,
            failed: failCount
        }, { status: 200 })

    } catch (error) {
        console.error('Webhook processing failed:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
