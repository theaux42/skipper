
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Only run on server, not edge runtime
        const { startDomainValidationScheduler } = await import('./lib/scheduler')
        const { syncTunnelBindings } = await import('./lib/sync-tunnel-bindings')
        const { registerWarmer } = await import('./lib/server-cache')

        // Start the domain validation scheduler in the background
        startDomainValidationScheduler().catch(err => {
            console.error('[Startup] Failed to start domain validation scheduler:', err)
        })

        // Import existing tunnel bindings that aren't tracked in the DB
        syncTunnelBindings().catch(err => {
            console.error('[Startup] Failed to sync tunnel bindings:', err)
        })

        // Start a background warmer for system stats (refreshes every 10s, cached for 15s)
        try {
            const os = await import('os')
            const fs = await import('fs/promises')
            const { docker } = await import('./lib/docker')

            registerWarmer('system-stats', async () => {
                const cpus = os.cpus()
                const cpuCount = cpus.length
                let totalIdle = 0, totalTick = 0
                for (const cpu of cpus) {
                    for (const type in cpu.times) {
                        totalTick += (cpu.times as any)[type]
                    }
                    totalIdle += cpu.times.idle
                }
                const cpuPercent = 100 - (totalIdle / totalTick * 100)

                const totalMem = os.totalmem()
                const freeMem = os.freemem()
                const usedMem = totalMem - freeMem
                const memPercent = (usedMem / totalMem) * 100

                let diskTotal = 0, diskUsed = 0, diskPercent = 0
                try {
                    const statfs = await fs.statfs?.('/')
                    if (statfs) {
                        diskTotal = statfs.bsize * statfs.blocks
                        const diskFree = statfs.bsize * statfs.bfree
                        diskUsed = diskTotal - diskFree
                        diskPercent = (diskUsed / diskTotal) * 100
                    }
                } catch { }

                let dockerHealthy = false
                try { await docker.ping(); dockerHealthy = true } catch { }

                let cloudflared = { running: false, uptime: '', status: 'not found' }
                try {
                    const containers = await docker.listContainers({ all: true, filters: { name: ['homelab-cloudflared'] } })
                    if (containers.length > 0) {
                        const c = containers[0]
                        cloudflared = { running: c.State === 'running', uptime: c.Status || '', status: c.State || 'unknown' }
                    }
                } catch { }

                let networkRx = 0, networkTx = 0
                try {
                    const containers = await docker.listContainers()
                    for (const c of containers.slice(0, 10)) {
                        try {
                            const container = docker.getContainer(c.Id)
                            const stats = await container.stats({ stream: false })
                            if (stats.networks) {
                                for (const net of Object.values(stats.networks) as any[]) {
                                    networkRx += net.rx_bytes || 0
                                    networkTx += net.tx_bytes || 0
                                }
                            }
                        } catch { }
                    }
                } catch { }

                return {
                    cpu: { percent: Math.round(cpuPercent * 10) / 10, cores: cpuCount },
                    memory: { used: usedMem, total: totalMem, percent: Math.round(memPercent * 10) / 10 },
                    disk: { used: diskUsed, total: diskTotal, percent: Math.round(diskPercent * 10) / 10 },
                    network: { rx: networkRx, tx: networkTx },
                    docker: dockerHealthy,
                    cloudflared,
                }
            }, 15_000, 10_000)
        } catch (err) {
            console.error('[Startup] Failed to register system-stats warmer:', err)
        }
    }
}
