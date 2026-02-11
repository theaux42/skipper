
import { db } from '@/lib/db'
import { getCloudflareClient, getTunnel } from '@/lib/cloudflare'

/**
 * Reads the current Cloudflare Tunnel ingress config and imports any
 * hostname bindings that aren't already tracked in the DB.
 * This allows the panel to manage tunnel entries created outside of it.
 */
export async function syncTunnelBindings() {
    console.log('[Startup] Syncing tunnel bindings from Cloudflare...')

    try {
        // Check if Cloudflare is configured
        const cfSettings = await db.systemSetting.findMany({
            where: { key: { in: ['CF_API_TOKEN', 'CF_ACCOUNT_ID'] } }
        })

        const apiToken = cfSettings.find(s => s.key === 'CF_API_TOKEN')?.value
        const accountId = cfSettings.find(s => s.key === 'CF_ACCOUNT_ID')?.value
        if (!apiToken || !accountId) {
            console.log('[Startup] Cloudflare not configured, skipping tunnel sync')
            return
        }

        const { cf } = await getCloudflareClient()
        const tunnel = await getTunnel('homelab-panel-tunnel')
        if (!tunnel) {
            console.log('[Startup] No tunnel found, skipping binding sync')
            return
        }

        // Fetch current tunnel configuration
        let tunnelConfig: any
        try {
            tunnelConfig = await (cf as any).get(`/accounts/${accountId}/cfd_tunnel/${tunnel.id}/configurations`)
        } catch (e: any) {
            console.error('[Startup] Failed to fetch tunnel config:', e.message)
            return
        }

        const ingress = tunnelConfig?.result?.config?.ingress
        if (!Array.isArray(ingress)) {
            console.log('[Startup] No ingress rules found in tunnel config')
            return
        }

        // Get all existing exposed URLs
        const existingUrls = await db.exposedUrl.findMany()
        const existingHostnames = new Set(existingUrls.map(u => u.fullUrl))

        let importedCount = 0

        for (const rule of ingress) {
            // Skip the catch-all rule (no hostname)
            if (!rule.hostname) continue

            // Skip if already tracked
            if (existingHostnames.has(rule.hostname)) continue

            // Parse hostname into subdomain + domainSuffix
            const parts = rule.hostname.split('.')
            if (parts.length < 3) {
                console.log(`[Startup] Skipping ${rule.hostname} — not enough domain parts`)
                continue
            }
            const subdomain = parts[0]
            const domainSuffix = parts.slice(1).join('.')

            // Parse port from service URL (e.g. "http://container:3000" -> 3000)
            let port = 80
            try {
                const url = new URL(rule.service)
                port = parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80)
            } catch { }

            // Try to match a service by container name pattern: homelab-{projectId}-{serviceName}
            let serviceId: string | null = null
            try {
                const serviceUrl = new URL(rule.service)
                const containerHost = serviceUrl.hostname // e.g. homelab-abc123-web
                if (containerHost.startsWith('homelab-')) {
                    const rest = containerHost.slice('homelab-'.length) // abc123-web
                    // projectId is a cuid, find a service whose projectId + name matches
                    const allServices = await db.service.findMany({
                        include: { project: true }
                    })
                    for (const svc of allServices) {
                        const expectedContainer = `homelab-${svc.projectId}-${svc.name}`
                        if (expectedContainer === containerHost) {
                            serviceId = svc.id
                            break
                        }
                    }
                }
            } catch { }

            // If we couldn't match a service, try to find any running service as fallback
            if (!serviceId) {
                const fallback = await db.service.findFirst({
                    where: { status: 'RUNNING' },
                    orderBy: { updatedAt: 'desc' }
                })
                if (fallback) serviceId = fallback.id
            }

            if (!serviceId) {
                console.log(`[Startup] Skipping ${rule.hostname} — no service to bind to`)
                continue
            }

            // Create the exposed URL record
            try {
                await db.exposedUrl.create({
                    data: {
                        subdomain,
                        domainSuffix,
                        fullUrl: rule.hostname,
                        internalPort: port,
                        tunnelId: tunnel.id,
                        dnsRecordId: null, // DNS managed externally
                        serviceId,
                    }
                })
                importedCount++
                console.log(`[Startup] Imported tunnel binding: ${rule.hostname}`)
            } catch (e: any) {
                console.error(`[Startup] Failed to import ${rule.hostname}:`, e.message)
            }
        }

        if (importedCount > 0) {
            console.log(`[Startup] ✓ Imported ${importedCount} tunnel binding(s)`)
        } else {
            console.log('[Startup] ✓ All tunnel bindings already tracked')
        }

    } catch (error: any) {
        console.error('[Startup] Tunnel sync failed:', error.message)
    }
}
