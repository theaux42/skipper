
'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { processTemplate } from '@/lib/template-engine'
import { saveComposeContent } from '@/lib/actions/compose-actions'
import { exposeService } from '@/lib/actions/expose-actions'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import fs from 'fs/promises'
import path from 'path'

const META_PATH = path.join(process.cwd(), 'templates', 'meta.json')

const RANDOM_WORDS = [
    'app', 'web', 'hub', 'srv', 'box', 'lab', 'net', 'dev', 'run', 'pod',
    'node', 'edge', 'grid', 'flux', 'core', 'base', 'link', 'dock', 'dash', 'bolt'
]

/**
 * Sanitize a name into a valid subdomain label:
 * - lowercase
 * - replace spaces/underscores with hyphens
 * - strip any character that isn't a-z, 0-9 or hyphen
 * - collapse consecutive hyphens, trim leading/trailing hyphens
 * - cap length to 10
 * If the result is empty or still invalid, generate a random fallback.
 */
function sanitizeSubdomain(name: string): string {
    let sanitized = name
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 10)
        .replace(/-+$/, '') // trim trailing hyphen after slice

    // Must start with a letter or digit and be non-empty
    if (!sanitized || !/^[a-z0-9]/.test(sanitized)) {
        const word = RANDOM_WORDS[Math.floor(Math.random() * RANDOM_WORDS.length)]
        const digits = String(Math.floor(Math.random() * 900) + 100) // 100-999
        sanitized = `${word}${digits}`
    }

    return sanitized
}

/**
 * Find an available subdomain for a given domain suffix.
 * If the base subdomain is taken, appends an incrementing number (1, 2, 3...).
 */
async function findAvailableSubdomain(base: string, domainSuffix: string): Promise<string> {
    let candidate = base
    let suffix = 0

    while (true) {
        const fullUrl = `${candidate}.${domainSuffix}`
        const existing = await db.exposedUrl.findFirst({ where: { fullUrl } })
        if (!existing) return candidate
        suffix++
        candidate = `${base}${suffix}`
    }
}

export interface TemplateMeta {
    id: string
    name: string
    version: string
    description: string
    logo: string
    links: {
        github?: string
        website?: string
        docs?: string
    }
    tags: string[]
}

let cachedMeta: TemplateMeta[] | null = null

export async function getTemplates(): Promise<TemplateMeta[]> {
    if (cachedMeta) return cachedMeta
    try {
        const raw = await fs.readFile(META_PATH, 'utf-8')
        cachedMeta = JSON.parse(raw) as TemplateMeta[]
        return cachedMeta
    } catch (e) {
        console.error('Failed to load templates meta.json:', e)
        return []
    }
}

export async function searchTemplates(query?: string, tag?: string): Promise<TemplateMeta[]> {
    let templates = await getTemplates()

    if (query) {
        const q = query.toLowerCase()
        templates = templates.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            t.tags.some(tag => tag.toLowerCase().includes(q))
        )
    }

    if (tag) {
        const t = tag.toLowerCase()
        templates = templates.filter(tpl =>
            tpl.tags.some(tplTag => tplTag.toLowerCase() === t)
        )
    }

    return templates
}

export async function deployTemplate(templateId: string, projectName: string) {
    const session = await getSession()
    if (!session) throw new Error('Unauthorized')

    // 1. Get template meta
    const templates = await getTemplates()
    const meta = templates.find(t => t.id === templateId)
    if (!meta) {
        return { success: false, error: 'Template not found' }
    }

    // 2. Get global domain settings
    let defaultDomain = ''
    try {
        const setting = await db.systemSetting.findUnique({ where: { key: 'DEFAULT_DEPLOY_DOMAIN' } })
        defaultDomain = setting?.value || ''
    } catch { }

    // 3. Process the template (resolve variables, read compose)
    let processed
    try {
        processed = await processTemplate(templateId, defaultDomain || undefined)
    } catch (e: any) {
        return { success: false, error: `Failed to process template: ${e.message}` }
    }

    // 4. Create Project
    const project = await db.project.create({
        data: {
            name: projectName || meta.name,
            description: meta.description,
            ownerId: session.userId,
            type: 'COMPOSE',
        }
    })

    // 5. Save compose content + write files to disk (synchronous — must complete before redirect)
    const envString = Object.entries(processed.envVars)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n')

    const saveResult = await saveComposeContent(project.id, processed.composeContent, envString)
    if (!saveResult.success) {
        console.error('Failed to save compose content for template:', saveResult.error)
    }

    // 6. Auto-expose domains via Cloudflare (if configured)
    if (defaultDomain && processed.domains.length > 0) {
        let hasCloudflare = false
        try {
            const cfToken = await db.systemSetting.findUnique({ where: { key: 'CF_API_TOKEN' } })
            const cfAccount = await db.systemSetting.findUnique({ where: { key: 'CF_ACCOUNT_ID' } })
            hasCloudflare = !!(cfToken?.value && cfAccount?.value)
        } catch { }

        if (hasCloudflare) {
            const primaryDomain = processed.domains[0]
            if (primaryDomain) {
                try {
                    const service = await db.service.findFirst({
                        where: { projectId: project.id, name: primaryDomain.serviceName }
                    })

                    if (service) {
                        const sanitized = sanitizeSubdomain(projectName || meta.name || templateId)
                        const subdomain = await findAvailableSubdomain(sanitized, defaultDomain)

                        const formData = new FormData()
                        formData.set('serviceId', service.id)
                        formData.set('subdomain', subdomain)
                        formData.set('domainSuffix', defaultDomain)
                        formData.set('port', String(primaryDomain.port))

                        await exposeService(formData)
                    }
                } catch (e) {
                    console.error('Auto-expose failed (non-fatal):', e)
                }
            }
        }
    }

    revalidatePath('/dashboard')
    redirect(`/projects/${project.id}`)
}
