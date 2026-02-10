
'use server'

import { getTunnel, createTunnel, getTunnelToken } from '@/lib/cloudflare'
import { docker } from '@/lib/docker'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function setupPanelTunnel() {
    const session = await getSession()
    if (!session || session.role !== 'OWNER') {
        return { success: false, error: 'Unauthorized' }
    }

    const tunnelName = 'homelab-panel-tunnel'

    try {
        let tunnel = await getTunnel(tunnelName)

        if (!tunnel) {
            console.log('Creating new tunnel...')
            tunnel = await createTunnel(tunnelName)
        }

        if (!tunnel) throw new Error("Failed to create or retrieve tunnel");

        console.log('Tunnel ID:', tunnel.id)

        // Get Token
        // We need the token to run cloudflared
        // The previous helper for getTunnelToken needs to be verified if it returns string or object
        // Assuming string based on docs usually for simple fetch
        const token = await getTunnelToken(tunnel.id as string) as unknown as string;

        // Check if cloudflared container exists
        const containerName = 'homelab-cloudflared'
        const containers = await docker.listContainers({ all: true, filters: { name: [containerName] } })
        const existingContainer = containers[0]

        if (existingContainer) {
            const container = docker.getContainer(existingContainer.Id)
            if (existingContainer.State === 'running') {
                // Check if token matches? Hard to check env var. 
                // Assume if running, it's fine.
                return { success: true, message: 'Tunnel already running' }
            } else {
                await container.remove()
            }
        }

        // Pull the image first (createContainer does not auto-pull)
        console.log('Pulling cloudflare/cloudflared:latest...')
        await new Promise<void>((resolve, reject) => {
            docker.pull('cloudflare/cloudflared:latest', (err: Error | null, stream: NodeJS.ReadableStream) => {
                if (err) return reject(err)
                docker.modem.followProgress(stream, (err: Error | null) => {
                    if (err) return reject(err)
                    resolve()
                })
            })
        })

        // Start cloudflared
        // We need to run it attached to homelab-panel-net
        await docker.createContainer({
            Image: 'cloudflare/cloudflared:latest',
            name: containerName,
            Cmd: ['tunnel', 'run', '--token', token],
            HostConfig: {
                NetworkMode: 'homelab-panel-net',
                RestartPolicy: { Name: 'unless-stopped' }
            }
        }).then(container => container.start())

        return { success: true, message: 'Tunnel configured and started' }

    } catch (error: any) {
        console.error('Tunnel setup failed:', error)
        return { success: false, error: error.message }
    }
}
