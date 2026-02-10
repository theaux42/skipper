
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { validateDomainRecords } from '@/lib/startup-tasks'

export async function getDomainValidationSettings() {
    const settings = await db.systemSetting.findMany({
        where: {
            key: {
                in: ['DOMAIN_VALIDATION_ENABLED', 'DOMAIN_VALIDATION_INTERVAL', 'DOMAIN_VALIDATION_LAST_RUN']
            }
        }
    })

    const enabled = settings.find(s => s.key === 'DOMAIN_VALIDATION_ENABLED')?.value === 'true'
    const interval = parseInt(settings.find(s => s.key === 'DOMAIN_VALIDATION_INTERVAL')?.value || '24')
    const lastRun = settings.find(s => s.key === 'DOMAIN_VALIDATION_LAST_RUN')?.value || null

    return { enabled, interval, lastRun }
}

export async function saveDomainValidationSettings(enabled: boolean, intervalHours: number) {
    if (intervalHours < 1) {
        return { success: false, error: 'Interval must be at least 1 hour' }
    }

    try {
        await db.systemSetting.upsert({
            where: { key: 'DOMAIN_VALIDATION_ENABLED' },
            create: { key: 'DOMAIN_VALIDATION_ENABLED', value: enabled.toString() },
            update: { value: enabled.toString() }
        })

        await db.systemSetting.upsert({
            where: { key: 'DOMAIN_VALIDATION_INTERVAL' },
            create: { key: 'DOMAIN_VALIDATION_INTERVAL', value: intervalHours.toString() },
            update: { value: intervalHours.toString() }
        })

        // Restart the scheduler with new settings
        const { startDomainValidationScheduler } = await import('@/lib/scheduler')
        await startDomainValidationScheduler()

        revalidatePath('/settings')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function triggerDomainValidation() {
    try {
        await validateDomainRecords()

        // Update last run timestamp
        await db.systemSetting.upsert({
            where: { key: 'DOMAIN_VALIDATION_LAST_RUN' },
            create: { key: 'DOMAIN_VALIDATION_LAST_RUN', value: new Date().toISOString() },
            update: { value: new Date().toISOString() }
        })

        revalidatePath('/settings')
        return { success: true, message: 'Validation completed successfully' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
