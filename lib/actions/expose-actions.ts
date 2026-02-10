
'use server'

import { db } from '@/lib/db'
import { getCloudflareClient, getTunnel } from '@/lib/cloudflare'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const exposeSchema = z.object({
    serviceId: z.string(),
    subdomain: z.string().min(1),
    domainSuffix: z.string().min(1),
    port: z.coerce.number().int().min(1).max(65535),
})

export async function exposeService(formData: FormData) {
    const serviceId = formData.get('serviceId') as string
    const subdomain = formData.get('subdomain') as string
    const domainSuffix = formData.get('domainSuffix') as string
    const port = formData.get('port') as string

    const validation = exposeSchema.safeParse({ serviceId, subdomain, domainSuffix, port })
    if (!validation.success) {
        return { success: false, error: validation.error.message }
    }

    const fullUrl = `${subdomain}.${domainSuffix}`

    // Check if already exists
    const existing = await db.exposedUrl.findFirst({ where: { fullUrl } })
    if (existing) return { success: false, error: 'This URL is already in use' }

    const service = await db.service.findUnique({ where: { id: serviceId } })
    if (!service) return { success: false, error: 'Service not found' }

    try {
        const { cf, accountId } = await getCloudflareClient()
        const tunnelName = 'homelab-panel-tunnel'
        const tunnel = await getTunnel(tunnelName)

        let dnsRecordId: string | null = null

        if (tunnel) {
            // Create DNS CNAME record pointing to tunnel
            try {
                const zones = await cf.zones.list({ name: domainSuffix })
                if (zones.result && zones.result.length > 0) {
                    const zoneId = zones.result[0].id
                    const fullRecordName = `${subdomain}.${domainSuffix}`
                    const targetContent = `${tunnel.id}.cfargotunnel.com`

                    // Check for existing record
                    const existingRecords = await cf.dns.records.list({
                        zone_id: zoneId,
                        name: { exact: fullRecordName },
                        type: 'CNAME'
                    })

                    if (existingRecords.result && existingRecords.result.length > 0) {
                        const record = existingRecords.result[0]
                        if (record.content !== targetContent) {
                            // Update existing record
                            console.log(`Updating existing DNS record for ${fullRecordName}`)
                            await cf.dns.records.edit(record.id, {
                                zone_id: zoneId,
                                type: 'CNAME',
                                name: subdomain,
                                content: targetContent,
                                proxied: true,
                                ttl: 1,
                                comment: 'Homelab Panel Auto-updated'
                            })
                        }
                        dnsRecordId = record.id
                    } else {
                        // Create new record
                        console.log(`Creating new DNS record for ${fullRecordName}`)
                        const dnsRecord = await cf.dns.records.create({
                            zone_id: zoneId,
                            type: 'CNAME',
                            name: subdomain,
                            content: targetContent,
                            proxied: true,
                            ttl: 1,
                            comment: 'Homelab Panel Auto-created'
                        })
                        dnsRecordId = dnsRecord.id || null
                    }
                }
            } catch (e: any) {
                console.error('DNS record operation failed:', e)
            }
        }

        // Save to DB
        const exposed = await db.exposedUrl.create({
            data: {
                subdomain,
                domainSuffix,
                fullUrl,
                internalPort: validation.data.port,
                tunnelId: tunnel?.id as string || null,
                dnsRecordId,
                serviceId,
            }
        })

        // Update tunnel config
        await updateTunnelConfigInternal()

        revalidatePath(`/projects/${service.projectId}/services/${serviceId}`)
        revalidatePath('/domains')
        return { success: true, url: fullUrl }

    } catch (e: any) {
        console.error('Expose failed:', e)
        return { success: false, error: e.message }
    }
}

export async function unexposeService(exposedUrlId: string) {
    const exposed = await db.exposedUrl.findUnique({
        where: { id: exposedUrlId },
        include: { service: true }
    })

    if (!exposed) return { success: false, error: 'Not found' }

    // Cleanup DNS record
    if (exposed.dnsRecordId) {
        try {
            const { cf } = await getCloudflareClient()
            const zones = await cf.zones.list({ name: exposed.domainSuffix })
            if (zones.result && zones.result.length > 0) {
                await cf.dns.records.delete(exposed.dnsRecordId, { zone_id: zones.result[0].id })
            }
        } catch (e: any) {
            console.error('Failed to cleanup DNS:', e)
        }
    }

    await db.exposedUrl.delete({ where: { id: exposedUrlId } })

    // Update tunnel config
    await updateTunnelConfigInternal()

    if (exposed.service) {
        revalidatePath(`/projects/${exposed.service.projectId}/services/${exposed.serviceId}`)
    }
    revalidatePath('/domains')
    return { success: true }
}

export async function addCustomDomain(data: {
    hostname: string
    protocol: string
    targetIp: string
    port: number
    serviceId?: string
}) {
    const { hostname, protocol, targetIp, port, serviceId } = data

    if (!hostname || !targetIp || !port) {
        return { success: false, error: 'All fields required' }
    }

    // Parse hostname into subdomain + domainSuffix
    const parts = hostname.split('.')
    const subdomain = parts[0]
    const domainSuffix = parts.slice(1).join('.')

    if (!domainSuffix) return { success: false, error: 'Invalid hostname format (need subdomain.domain.tld)' }

    // Check if we have a service to attach to, or find by container name
    let resolvedServiceId = serviceId
    if (!resolvedServiceId) {
        // Try matching by IP/container name
        const service = await db.service.findFirst({
            where: { status: 'RUNNING' },
            orderBy: { updatedAt: 'desc' }
        })
        if (service) resolvedServiceId = service.id
    }

    if (!resolvedServiceId) {
        return { success: false, error: 'No service available to bind' }
    }

    const fullUrl = hostname

    const existing = await db.exposedUrl.findFirst({ where: { fullUrl } })
    if (existing) return { success: false, error: 'Hostname already in use' }

    try {
        const { cf, accountId } = await getCloudflareClient()
        const tunnel = await getTunnel('homelab-panel-tunnel')

        let dnsRecordId: string | null = null

        if (tunnel) {
            try {
                const zones = await cf.zones.list({ name: domainSuffix })
                if (zones.result && zones.result.length > 0) {
                    const zoneId = zones.result[0].id
                    const dnsRecord = await cf.dns.records.create({
                        zone_id: zoneId,
                        type: 'CNAME',
                        name: subdomain,
                        content: `${tunnel.id}.cfargotunnel.com`,
                        proxied: true,
                        ttl: 1,
                        comment: 'Homelab Panel Custom Domain'
                    })
                    dnsRecordId = dnsRecord.id || null
                }
            } catch (e: any) {
                console.error('DNS creation failed:', e)
            }
        }

        await db.exposedUrl.create({
            data: {
                subdomain,
                domainSuffix,
                fullUrl,
                internalPort: port,
                tunnelId: tunnel?.id as string || null,
                dnsRecordId,
                serviceId: resolvedServiceId,
            }
        })

        await updateTunnelConfigInternal()

        revalidatePath('/domains')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// Internal helper to update tunnel ingress config
async function updateTunnelConfigInternal() {
    try {
        const { cf, accountId } = await getCloudflareClient()
        const tunnel = await getTunnel('homelab-panel-tunnel')
        if (!tunnel) return

        const exposedServices = await db.exposedUrl.findMany({
            include: { service: true }
        })

        const ingress: any[] = exposedServices.map((sub: any) => {
            const containerName = `homelab-${sub.service.projectId}-${sub.service.name}`
            return {
                hostname: sub.fullUrl,
                service: `http://${containerName}:${sub.internalPort}`
            }
        })

        ingress.push({ service: 'http_status:404' } as any)

        await (cf as any).put(`/accounts/${accountId}/cfd_tunnel/${tunnel.id}/configurations`, {
            body: { config: { ingress } }
        })
    } catch (e: any) {
        console.error('Failed to update tunnel config:', e)
    }
}
