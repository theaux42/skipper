
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { docker } from '@/lib/docker'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function getSettings() {
    const settings = await db.systemSetting.findMany()
    return settings.reduce((acc: Record<string, string>, curr: { key: string; value: string }) => {
        acc[curr.key] = curr.value
        return acc
    }, {} as Record<string, string>)
}

export async function updateSetting(key: string, value: string) {
    await db.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
    })
    revalidatePath('/settings')
    return { success: true }
}

export async function systemCommand(command: 'prune-images' | 'prune-containers' | 'restart-panel') {
    try {
        switch (command) {
            case 'prune-images':
                await docker.pruneImages()
                return { success: true, message: 'Unused images pruned.' }
            case 'prune-containers':
                await docker.pruneContainers()
                return { success: true, message: 'Stopped containers pruned.' }
            case 'restart-panel':
                // This will kill the node process, orchestrator should restart it
                setTimeout(() => process.exit(0), 1000)
                return { success: true, message: 'Panel restarting...' }
            default:
                throw new Error('Unknown command')
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
