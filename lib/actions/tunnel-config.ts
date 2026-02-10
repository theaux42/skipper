
'use server'

import { getTunnel, getCloudflareClient } from '@/lib/cloudflare'
import { db } from '@/lib/db'

export async function updateTunnelConfig() {
    const { cf, accountId } = await getCloudflareClient()

    const exposedServices = await db.exposedUrl.findMany({
        include: { service: true }
    })

    const tunnelName = 'homelab-panel-tunnel'
    const tunnel = await getTunnel(tunnelName)
    if (!tunnel) throw new Error("Tunnel not found")

    const ingress: any[] = exposedServices.map((sub: any) => {
        const containerName = `homelab-${sub.service.projectId}-${sub.service.name}`
        return {
            hostname: sub.fullUrl,
            service: `http://${containerName}:${sub.internalPort}`
        }
    })

    ingress.push({ service: 'http_status:404' } as any)

    console.log('Updating tunnel config with ingress:', ingress)

    try {
        await (cf as any).put(`/accounts/${accountId}/cfd_tunnel/${tunnel.id}/configurations`, {
            body: { config: { ingress } }
        })
        return { success: true }
    } catch (error: any) {
        console.error('Failed to update tunnel config:', error)
        return { success: false, error: error.message }
    }
}
