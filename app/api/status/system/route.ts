
import { NextResponse } from 'next/server'
import { docker } from '@/lib/docker'
import { getSession } from '@/lib/auth'
import os from 'os'
import fs from 'fs/promises'
import { getCached } from '@/lib/server-cache'

async function fetchSystemStats() {
    // CPU usage
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

    // Memory
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memPercent = (usedMem / totalMem) * 100

    // Disk usage (root partition)
    let diskTotal = 0, diskUsed = 0, diskPercent = 0
    try {
        const statfs = await fs.statfs?.('/')
        if (statfs) {
            diskTotal = statfs.bsize * statfs.blocks
            const diskFree = statfs.bsize * statfs.bfree
            diskUsed = diskTotal - diskFree
            diskPercent = (diskUsed / diskTotal) * 100
        }
    } catch {
        // Fallback: try df command approach
    }

    // Docker info
    let dockerHealthy = false
    try {
        await docker.ping()
        dockerHealthy = true
    } catch { }

    // Cloudflared container status
    let cloudflared = { running: false, uptime: '', status: 'not found' }
    try {
        const containers = await docker.listContainers({ all: true, filters: { name: ['homelab-cloudflared'] } })
        if (containers.length > 0) {
            const c = containers[0]
            cloudflared = {
                running: c.State === 'running',
                uptime: c.Status || '',
                status: c.State || 'unknown'
            }
        }
    } catch { }

    // Network I/O (aggregate from Docker)
    let networkRx = 0, networkTx = 0
    try {
        const containers = await docker.listContainers()
        for (const c of containers.slice(0, 10)) { // limit to avoid overload
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
}

export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Cache system stats for 15 seconds — avoids re-computing per poll
        const data = await getCached('system-stats', fetchSystemStats, 15_000)
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('System status error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
