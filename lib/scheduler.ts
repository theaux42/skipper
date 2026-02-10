
import { db } from '@/lib/db'
import { validateDomainRecords } from '@/lib/startup-tasks'

let schedulerInterval: NodeJS.Timeout | null = null

export async function startDomainValidationScheduler() {
    // Stop existing scheduler if running
    if (schedulerInterval) {
        clearInterval(schedulerInterval)
        schedulerInterval = null
    }

    try {
        // Get settings
        const settings = await db.systemSetting.findMany({
            where: {
                key: { in: ['DOMAIN_VALIDATION_ENABLED', 'DOMAIN_VALIDATION_INTERVAL'] }
            }
        })

        const enabled = settings.find(s => s.key === 'DOMAIN_VALIDATION_ENABLED')?.value === 'true'
        const intervalHours = parseInt(settings.find(s => s.key === 'DOMAIN_VALIDATION_INTERVAL')?.value || '24')

        if (!enabled) {
            console.log('[Scheduler] Domain validation scheduler is disabled')
            return
        }

        // Convert hours to milliseconds
        const intervalMs = intervalHours * 60 * 60 * 1000

        console.log(`[Scheduler] Starting domain validation scheduler (every ${intervalHours} hours)`)

        // Run immediately on startup
        await validateDomainRecords()

        // Update last run timestamp
        await db.systemSetting.upsert({
            where: { key: 'DOMAIN_VALIDATION_LAST_RUN' },
            create: { key: 'DOMAIN_VALIDATION_LAST_RUN', value: new Date().toISOString() },
            update: { value: new Date().toISOString() }
        })

        // Set up recurring validation
        schedulerInterval = setInterval(async () => {
            console.log('[Scheduler] Running scheduled domain validation')
            try {
                await validateDomainRecords()

                // Update last run timestamp
                await db.systemSetting.upsert({
                    where: { key: 'DOMAIN_VALIDATION_LAST_RUN' },
                    create: { key: 'DOMAIN_VALIDATION_LAST_RUN', value: new Date().toISOString() },
                    update: { value: new Date().toISOString() }
                })
            } catch (error) {
                console.error('[Scheduler] Domain validation failed:', error)
            }
        }, intervalMs)

    } catch (error) {
        console.error('[Scheduler] Failed to start domain validation scheduler:', error)
    }
}

export function stopDomainValidationScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval)
        schedulerInterval = null
        console.log('[Scheduler] Domain validation scheduler stopped')
    }
}
