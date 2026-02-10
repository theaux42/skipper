
'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { processTemplate, injectNetworkConfig } from '@/lib/template-engine'
import { deployComposeProject } from '@/lib/actions/compose-actions'
import { exposeService } from '@/lib/actions/expose-actions'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import fs from 'fs/promises'
import path from 'path'

const META_PATH = path.join(process.cwd(), 'templates', 'meta.json')

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

    // 5. Build env string
    const envString = Object.entries(processed.envVars)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n')

    // 6. Inject Network Config & Deploy as Compose
    const finalComposeContent = injectNetworkConfig(processed.composeContent, project.id)
    const result = await deployComposeProject(project.id, finalComposeContent, envString)

    if (!result.success) {
        return { success: false, error: result.error, projectId: project.id }
    }

    // 7. Auto-expose domains via Cloudflare (if configured)
    if (defaultDomain && processed.domains.length > 0) {
        let hasCloudflare = false
        try {
            const cfToken = await db.systemSetting.findUnique({ where: { key: 'CF_API_TOKEN' } })
            const cfAccount = await db.systemSetting.findUnique({ where: { key: 'CF_ACCOUNT_ID' } })
            hasCloudflare = !!(cfToken?.value && cfAccount?.value)
        } catch { }

        if (hasCloudflare) {
            // Expose the primary domain (first one in config)
            const primaryDomain = processed.domains[0]
            if (primaryDomain) {
                try {
                    // Find the matching service in the project
                    const service = await db.service.findFirst({
                        where: {
                            projectId: project.id,
                            name: primaryDomain.serviceName
                        }
                    })

                    if (service) {
                        const formData = new FormData()
                        formData.set('serviceId', service.id)
                        formData.set('subdomain', templateId)
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
