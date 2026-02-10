
import yaml from 'yaml'

export interface ParsedCompose {
    services: {
        name: string
        image?: string
        build?: string | { context: string }
        environment?: Record<string, string> | string[]
        ports?: string[]
    }[]
}

export function parseComposeFile(content: string): ParsedCompose {
    try {
        const doc = yaml.parse(content)
        if (!doc || !doc.services) {
            return { services: [] }
        }

        const services = Object.entries(doc.services).map(([name, config]: [string, any]) => {
            return {
                name,
                image: config.image,
                build: config.build,
                environment: config.environment,
                ports: config.ports
            }
        })

        return { services }
    } catch (e) {
        console.error('Failed to parse compose:', e)
        return { services: [] }
    }
}
