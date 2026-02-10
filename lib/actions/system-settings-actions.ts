
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

interface GlobalDomainSettings {
    panelDomain: string
    defaultDeployDomain: string
}

export async function getGlobalDomainSettings(): Promise<GlobalDomainSettings> {
    const settings = await db.systemSetting.findMany({
        where: {
            key: {
                in: ['PANEL_DOMAIN', 'DEFAULT_DEPLOY_DOMAIN']
            }
        }
    })

    return {
        panelDomain: settings.find(s => s.key === 'PANEL_DOMAIN')?.value || '',
        defaultDeployDomain: settings.find(s => s.key === 'DEFAULT_DEPLOY_DOMAIN')?.value || ''
    }
}

export async function saveGlobalDomainSettings(settings: GlobalDomainSettings) {
    try {
        await db.systemSetting.upsert({
            where: { key: 'PANEL_DOMAIN' },
            create: { key: 'PANEL_DOMAIN', value: settings.panelDomain },
            update: { value: settings.panelDomain }
        })

        await db.systemSetting.upsert({
            where: { key: 'DEFAULT_DEPLOY_DOMAIN' },
            create: { key: 'DEFAULT_DEPLOY_DOMAIN', value: settings.defaultDeployDomain },
            update: { value: settings.defaultDeployDomain }
        })

        revalidatePath('/settings')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
