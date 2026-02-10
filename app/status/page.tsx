
import { db } from '@/lib/db'
import { docker } from '@/lib/docker'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { StatusDashboard } from '@/components/status/status-dashboard'

export default async function StatusPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const services = await db.service.findMany({
        include: {
            project: true,
            exposedUrls: true,
        },
        orderBy: { updatedAt: 'desc' }
    })

    // Get container uptimes
    const servicesWithUptime = await Promise.all(
        services.map(async (service) => {
            let uptime = ''
            if (service.containerId) {
                try {
                    const container = docker.getContainer(service.containerId)
                    const info = await container.inspect()
                    if (info.State.Running && info.State.StartedAt) {
                        const started = new Date(info.State.StartedAt)
                        const diff = Date.now() - started.getTime()
                        const hours = Math.floor(diff / 3600000)
                        const mins = Math.floor((diff % 3600000) / 60000)
                        if (hours > 24) {
                            uptime = `${Math.floor(hours / 24)}d ${hours % 24}h`
                        } else if (hours > 0) {
                            uptime = `${hours}h ${mins}m`
                        } else {
                            uptime = `${mins}m`
                        }
                    }
                } catch { }
            }
            return {
                ...service,
                uptime,
                exposedUrls: service.exposedUrls,
                project: service.project,
            }
        })
    )

    return (
        <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Status</h1>
            <p className="text-muted-foreground mb-8">System health and service status overview.</p>

            <StatusDashboard services={JSON.parse(JSON.stringify(servicesWithUptime))} />
        </div>
    )
}
