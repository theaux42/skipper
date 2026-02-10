
import { randomUUID, randomBytes } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { parseDocument } from 'yaml'

// ─── Simple TOML Parser ─────────────────────────────────────────────────
// Handles the subset of TOML used by Dokploy template.toml files:
//   - [section] and [[array.of.tables]]
//   - Key-value pairs (strings, numbers, arrays, inline tables)

function parseToml(content: string): any {
    const result: any = {}
    let currentSection: any = result
    let currentPath: string[] = []
    let isArrayTable = false

    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim()

        // Skip empty lines and comments
        if (!line || line.startsWith('#')) continue

        // Remove inline comments (but not inside strings)
        const commentIdx = findInlineComment(line)
        if (commentIdx >= 0) {
            line = line.substring(0, commentIdx).trim()
        }

        // Array of tables: [[section.name]]
        const arrayMatch = line.match(/^\[\[(.+)\]\]$/)
        if (arrayMatch) {
            const pathParts = arrayMatch[1].split('.')
            isArrayTable = true
            currentPath = pathParts

            // Navigate to parent
            let target = result
            for (let j = 0; j < pathParts.length - 1; j++) {
                if (!target[pathParts[j]]) target[pathParts[j]] = {}
                target = target[pathParts[j]]
            }

            const lastKey = pathParts[pathParts.length - 1]
            if (!target[lastKey]) target[lastKey] = []
            const newItem: any = {}
            target[lastKey].push(newItem)
            currentSection = newItem
            continue
        }

        // Regular section: [section.name]
        const sectionMatch = line.match(/^\[(.+)\]$/)
        if (sectionMatch) {
            const pathParts = sectionMatch[1].split('.')
            isArrayTable = false
            currentPath = pathParts

            let target = result
            for (const part of pathParts) {
                if (!target[part]) target[part] = {}
                target = target[part]
            }
            currentSection = target
            continue
        }

        // Key-value pair
        const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.+)$/)
        if (kvMatch) {
            const key = kvMatch[1].trim()
            const rawValue = kvMatch[2].trim()
            currentSection[key] = parseTomlValue(rawValue, lines, i)
        }
    }

    return result
}

function findInlineComment(line: string): number {
    let inString = false
    let strChar = ''
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inString) {
            if (ch === strChar) inString = false
        } else {
            if (ch === '"' || ch === "'") {
                inString = true
                strChar = ch
            } else if (ch === '#') {
                return i
            }
        }
    }
    return -1
}

function parseTomlValue(raw: string, _lines?: string[], _lineIdx?: number): any {
    // String
    if (raw.startsWith('"') && raw.endsWith('"')) {
        return raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n')
    }
    if (raw.startsWith("'") && raw.endsWith("'")) {
        return raw.slice(1, -1)
    }

    // Number (handle TOML underscored numbers like 3_000)
    const numClean = raw.replace(/_/g, '')
    if (/^-?\d+$/.test(numClean)) return parseInt(numClean, 10)
    if (/^-?\d+\.\d+$/.test(numClean)) return parseFloat(numClean)

    // Boolean
    if (raw === 'true') return true
    if (raw === 'false') return false

    // Array
    if (raw.startsWith('[')) {
        return parseTomlArray(raw)
    }

    // Inline table
    if (raw.startsWith('{')) {
        return parseInlineTable(raw)
    }

    return raw
}

function parseTomlArray(raw: string): any[] {
    // Remove brackets
    const inner = raw.slice(1, raw.length - 1).trim()
    if (!inner) return []

    const items: any[] = []
    let current = ''
    let depth = 0
    let inString = false
    let strChar = ''

    for (const ch of inner) {
        if (inString) {
            current += ch
            if (ch === strChar) inString = false
        } else if (ch === '"' || ch === "'") {
            inString = true
            strChar = ch
            current += ch
        } else if (ch === '[' || ch === '{') {
            depth++
            current += ch
        } else if (ch === ']' || ch === '}') {
            depth--
            current += ch
        } else if (ch === ',' && depth === 0) {
            const trimmed = current.trim()
            if (trimmed) items.push(parseTomlValue(trimmed))
            current = ''
        } else {
            current += ch
        }
    }
    const trimmed = current.trim()
    if (trimmed) items.push(parseTomlValue(trimmed))

    return items
}

function parseInlineTable(raw: string): Record<string, any> {
    const inner = raw.slice(1, raw.length - 1).trim()
    if (!inner) return {}

    const result: Record<string, any> = {}
    const pairs = inner.split(',')
    for (const pair of pairs) {
        const eqIdx = pair.indexOf('=')
        if (eqIdx >= 0) {
            const key = pair.substring(0, eqIdx).trim()
            const val = pair.substring(eqIdx + 1).trim()
            result[key] = parseTomlValue(val)
        }
    }
    return result
}

// ─── Variable Resolver ───────────────────────────────────────────────────

function generatePassword(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const bytes = randomBytes(length)
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length]
    }
    return result
}

function generateHash(length: number): string {
    return randomBytes(Math.ceil(length / 2)).toString('hex').substring(0, length)
}

function generateBase64(length: number): string {
    return randomBytes(length).toString('base64').substring(0, length)
}

export interface TemplateDomain {
    serviceName: string
    port: number
    host: string
    path?: string
}

export interface ResolvedTemplate {
    envVars: Record<string, string>
    domains: TemplateDomain[]
    composeContent: string
}

export function resolveTemplateVariables(
    tomlContent: string,
    defaultDomain?: string,
    templateId?: string
): { resolvedVars: Record<string, string>; domains: TemplateDomain[] } {
    const parsed = parseToml(tomlContent)

    const variables = parsed.variables || {}
    const config = parsed.config || {}

    // First pass: resolve variable declarations
    const resolvedVars: Record<string, string> = {}

    // Generate the auto-domain
    const autoDomain = (defaultDomain && templateId)
        ? `${templateId}.${defaultDomain}`
        : `localhost`

    for (const [key, rawValue] of Object.entries(variables)) {
        resolvedVars[key] = resolveValue(String(rawValue), autoDomain, resolvedVars)
    }

    // Resolve env vars from config
    const envResult: Record<string, string> = {}

    if (config.env) {
        if (Array.isArray(config.env)) {
            // Array format: ["KEY=VALUE", "DB_PASSWORD=${db_pass}"]
            for (const item of config.env) {
                const str = String(item)
                const eqIdx = str.indexOf('=')
                if (eqIdx >= 0) {
                    const key = str.substring(0, eqIdx)
                    const val = str.substring(eqIdx + 1)
                    envResult[key] = resolveValue(val, autoDomain, resolvedVars)
                }
            }
        } else if (typeof config.env === 'object') {
            // Object format: { KEY = "VALUE" }
            for (const [key, val] of Object.entries(config.env)) {
                envResult[key] = resolveValue(String(val), autoDomain, resolvedVars)
            }
        }
    }

    // Resolve domains
    const domains: TemplateDomain[] = []
    if (config.domains && Array.isArray(config.domains)) {
        for (const d of config.domains) {
            domains.push({
                serviceName: d.serviceName || '',
                port: typeof d.port === 'number' ? d.port : parseInt(String(d.port), 10),
                host: resolveValue(String(d.host || ''), autoDomain, resolvedVars),
                path: d.path || undefined
            })
        }
    }

    return { resolvedVars: envResult, domains }
}

function resolveValue(
    value: string,
    autoDomain: string,
    resolvedVars: Record<string, string>
): string {
    return value.replace(/\$\{([^}]+)\}/g, (match, expr) => {
        const trimmed = expr.trim()

        // ${domain}
        if (trimmed === 'domain') return autoDomain

        // ${password:N}
        const pwMatch = trimmed.match(/^password:(\d+)$/)
        if (pwMatch) return generatePassword(parseInt(pwMatch[1], 10))

        // ${base64:N}
        const b64Match = trimmed.match(/^base64:(\d+)$/)
        if (b64Match) return generateBase64(parseInt(b64Match[1], 10))

        // ${hash:N}
        const hashMatch = trimmed.match(/^hash:(\d+)$/)
        if (hashMatch) return generateHash(parseInt(hashMatch[1], 10))

        // ${uuid}
        if (trimmed === 'uuid') return randomUUID()

        // ${randomPort}
        if (trimmed === 'randomPort') return String(30000 + Math.floor(Math.random() * 30000))

        // ${email}
        if (trimmed === 'email') return 'admin@example.com'

        // ${username}
        if (trimmed === 'username') return 'admin'

        // ${timestamp}
        if (trimmed === 'timestamp') return String(Math.floor(Date.now() / 1000))

        // ${timestamps:datetime}
        const tsMatch = trimmed.match(/^timestamps:(.+)$/)
        if (tsMatch) return String(Math.floor(new Date(tsMatch[1]).getTime() / 1000))

        // ${timestampms:datetime}
        const tsmsMatch = trimmed.match(/^timestampms:(.+)$/)
        if (tsmsMatch) return String(new Date(tsmsMatch[1]).getTime())

        // Variable reference
        if (resolvedVars[trimmed] !== undefined) return resolvedVars[trimmed]

        // Unknown — return as-is
        return match
    })
}

// ─── Full Template Processor ─────────────────────────────────────────────

const TEMPLATES_DIR = path.join(process.cwd(), 'templates', 'blueprints')

export async function processTemplate(
    templateId: string,
    defaultDomain?: string
): Promise<ResolvedTemplate> {
    const blueprintDir = path.join(TEMPLATES_DIR, templateId)

    // Read docker-compose.yml
    const composeContent = await fs.readFile(
        path.join(blueprintDir, 'docker-compose.yml'),
        'utf-8'
    )

    // Read template.toml
    let tomlContent = ''
    try {
        tomlContent = await fs.readFile(
            path.join(blueprintDir, 'template.toml'),
            'utf-8'
        )
    } catch {
        // Some templates might not have template.toml
    }

    const { resolvedVars, domains } = resolveTemplateVariables(
        tomlContent,
        defaultDomain,
        templateId
    )

    return {
        envVars: resolvedVars,
        domains,
        composeContent
    }
}

// ─── Network Injection ───────────────────────────────────────────────────

export function injectNetworkConfig(composeContent: string, projectId: string): string {
    const doc = parseDocument(composeContent)

    // 1. Ensure homelab-panel-net exists in top-level networks
    // doc.setIn handles creation of 'networks' if missing
    doc.setIn(['networks', 'homelab-panel-net'], { external: true })

    // 2. Iterate services to set container_name and join networks
    const services = doc.get('services') as any
    if (services && services.items) {
        for (const item of services.items) {
            const serviceKey = item.key.value
            const service = item.value

            // Set static container name: homelab-${projectId}-${serviceName}
            service.set('container_name', `homelab-${projectId}-${serviceKey}`)

            // Handle networks
            if (!service.has('networks')) {
                service.set('networks', [])
            }

            // service.get('networks') returns a JS object/array, not a YAML node
            const currentNetworks = service.get('networks')

            if (Array.isArray(currentNetworks)) {
                const newNetworks = [...currentNetworks]
                if (!newNetworks.includes('homelab-panel-net')) {
                    newNetworks.push('homelab-panel-net')
                }
                if (!newNetworks.includes('default')) {
                    newNetworks.push('default')
                }
                service.set('networks', newNetworks)
            } else if (currentNetworks && typeof currentNetworks === 'object') {
                const newNetworks = { ...currentNetworks }
                if (!newNetworks['homelab-panel-net']) {
                    newNetworks['homelab-panel-net'] = {}
                }
                if (!newNetworks['default']) {
                    newNetworks['default'] = {}
                }
                service.set('networks', newNetworks)
            }
        }
    }

    return doc.toString()
}
