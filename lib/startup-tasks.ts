
import { db } from '@/lib/db'
import { getCloudflareClient } from '@/lib/cloudflare'

export async function validateDomainRecords() {
    console.log('[Startup] Validating domain records against Cloudflare...')

    try {
        // Check if validation is enabled
        const enabledSetting = await db.systemSetting.findUnique({
            where: { key: 'DOMAIN_VALIDATION_ENABLED' }
        })

        if (enabledSetting?.value !== 'true') {
            console.log('[Startup] Domain validation is disabled, skipping')
            return
        }

        // Check if Cloudflare is configured
        const cfSettings = await db.systemSetting.findMany({
            where: { key: { in: ['CF_API_TOKEN', 'CF_ACCOUNT_ID'] } }
        })

        const apiToken = cfSettings.find(s => s.key === 'CF_API_TOKEN')?.value
        if (!apiToken) {
            console.log('[Startup] Cloudflare not configured, skipping domain validation')
            return
        }

        const { cf } = await getCloudflareClient()

        // Get all exposed URLs with DNS record IDs
        const exposedUrls = await db.exposedUrl.findMany({
            where: {
                dnsRecordId: { not: null }
            }
        })

        if (exposedUrls.length === 0) {
            console.log('[Startup] No domain records to validate')
            return
        }

        console.log(`[Startup] Checking ${exposedUrls.length} DNS records...`)

        let removedCount = 0

        for (const url of exposedUrls) {
            if (!url.dnsRecordId) continue

            try {
                // Get the zone for this domain
                const zones = await cf.zones.list({ name: url.domainSuffix })
                if (!zones.result || zones.result.length === 0) {
                    console.log(`[Startup] Zone not found for ${url.domainSuffix}, removing ${url.fullUrl}`)
                    await db.exposedUrl.delete({ where: { id: url.id } })
                    removedCount++
                    continue
                }

                const zoneId = zones.result[0].id

                // Try to fetch the DNS record
                try {
                    await cf.dns.records.get(url.dnsRecordId, { zone_id: zoneId })
                    // Record exists, all good
                } catch (error: any) {
                    // Record doesn't exist (404) or other error
                    if (error?.status === 404 || error?.message?.includes('not found')) {
                        console.log(`[Startup] DNS record not found for ${url.fullUrl}, removing from database`)
                        await db.exposedUrl.delete({ where: { id: url.id } })
                        removedCount++
                    } else {
                        console.error(`[Startup] Error checking DNS record for ${url.fullUrl}:`, error.message)
                    }
                }
            } catch (error: any) {
                console.error(`[Startup] Error validating ${url.fullUrl}:`, error.message)
            }
        }

        if (removedCount > 0) {
            console.log(`[Startup] ✓ Removed ${removedCount} orphaned domain record(s)`)
        } else {
            console.log('[Startup] ✓ All domain records validated successfully')
        }

    } catch (error: any) {
        console.error('[Startup] Domain validation failed:', error.message)
    }
}
