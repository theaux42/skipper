
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import Cloudflare from 'cloudflare'

export async function getCloudflareSettings() {
    const settings = await db.systemSetting.findMany({
        where: { key: { in: ['CF_API_TOKEN', 'CF_ACCOUNT_ID', 'CF_BASE_DOMAIN'] } }
    })

    return {
        token: settings.find(s => s.key === 'CF_API_TOKEN')?.value,
        accountId: settings.find(s => s.key === 'CF_ACCOUNT_ID')?.value,
        baseDomain: settings.find(s => s.key === 'CF_BASE_DOMAIN')?.value
    }
}

export async function saveCloudflareToken(token: string) {
    if (!token) throw new Error("Token required")

    // Verify token and fetch account ID
    try {
        const cf = new Cloudflare({ apiToken: token })
        const tokenVerify = await cf.user.tokens.verify()

        if (tokenVerify.status !== 'active') {
            throw new Error("Token is not active")
        }

        // Fetch Accounts
        const accounts = await cf.accounts.list()
        if (!accounts.result || accounts.result.length === 0) {
            throw new Error("No accounts found for this token")
        }

        // Use first account (User can verify in UI)
        const accountId = accounts.result[0].id

        await db.systemSetting.upsert({
            where: { key: 'CF_API_TOKEN' },
            create: { key: 'CF_API_TOKEN', value: token, description: 'Cloudflare API Token' },
            update: { value: token }
        })

        await db.systemSetting.upsert({
            where: { key: 'CF_ACCOUNT_ID' },
            create: { key: 'CF_ACCOUNT_ID', value: accountId, description: 'Cloudflare Account ID' },
            update: { value: accountId }
        })

        revalidatePath('/cloudflare')
        return { success: true, accountId }

    } catch (e: any) {
        console.error("CF Setup Error:", e)
        return { success: false, error: e.message || "Failed to verify token" }
    }
}

export async function saveBaseDomain(domain: string) {
    await db.systemSetting.upsert({
        where: { key: 'CF_BASE_DOMAIN' },
        create: { key: 'CF_BASE_DOMAIN', value: domain, description: 'Base Domain for Subdomains' },
        update: { value: domain }
    })
    revalidatePath('/cloudflare')
    return { success: true }
}

export async function listCloudflareZones() {
    const settings = await getCloudflareSettings()
    if (!settings.token) return []

    const cf = new Cloudflare({ apiToken: settings.token })
    try {
        const zones = await cf.zones.list({ account: { id: settings.accountId } })
        return zones.result.map(z => ({ id: z.id, name: z.name }))
    } catch (e) {
        console.error(e)
        return []
    }
}

export async function listCloudflareTunnels() {
    const settings = await getCloudflareSettings()
    if (!settings.token || !settings.accountId) return []

    const cf = new Cloudflare({ apiToken: settings.token })

    try {
        // @ts-ignore - Types might be outdated
        const tunnels = await cf.zeroTrust.tunnels.list({ account_id: settings.accountId, is_deleted: false })
        return tunnels.result || []
    } catch (e) {
        console.error(e)
        return []
    }
}
