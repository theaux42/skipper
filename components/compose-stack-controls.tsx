
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Square, RotateCcw, Hammer, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { composeStart, composeStop, composeRestart, composeRebuild, composeDown } from '@/lib/actions/compose-actions'

export function ComposeStackControls({ projectId, hasServices = false }: { projectId: string; hasServices?: boolean }) {
    const [loading, setLoading] = useState<string | null>(null)

    const run = async (action: string, fn: (id: string) => Promise<{ success: boolean; error?: string }>) => {
        setLoading(action)
        try {
            const res = await fn(projectId)
            if (res.success) {
                toast.success(`Stack ${action} successful`)
            } else {
                toast.error(res.error || `Stack ${action} failed`)
            }
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(null)
        }
    }

    const isLoading = loading !== null

    if (!hasServices) {
        return (
            <div className="text-sm text-muted-foreground italic">
                Deploy the stack first (Configuration tab)
            </div>
        )
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => run('start', composeStart)}
                disabled={isLoading}
            >
                {loading === 'start' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Start
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => run('stop', composeStop)}
                disabled={isLoading}
            >
                {loading === 'stop' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                Stop
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => run('restart', composeRestart)}
                disabled={isLoading}
            >
                {loading === 'restart' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                Restart
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => run('rebuild', composeRebuild)}
                disabled={isLoading}
            >
                {loading === 'rebuild' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hammer className="mr-2 h-4 w-4" />}
                Rebuild
            </Button>
            <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                    if (confirm('This will stop and remove all containers in the stack. Continue?')) {
                        run('down', composeDown)
                    }
                }}
                disabled={isLoading}
            >
                {loading === 'down' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Down
            </Button>
        </div>
    )
}
