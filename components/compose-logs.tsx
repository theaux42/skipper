
'use client'

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { Loader2, Terminal, Hammer } from 'lucide-react'
import { Button } from '@/components/ui/button'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function LogViewer({ logs, emptyMessage }: { logs: string; emptyMessage: string }) {
    if (!logs) {
        return (
            <div className="text-zinc-500 flex items-center justify-center h-full">
                {emptyMessage}
            </div>
        )
    }

    return (
        <>
            {logs.split('\n').map((line: string, i: number) => {
                let className = 'text-zinc-300'
                if (line.includes('ERROR') || line.includes('error') || line.includes('fatal')) className = 'text-red-400'
                else if (line.includes('Successfully') || line.includes('DONE') || line.includes('Started') || line.includes('Running')) className = 'text-emerald-400'
                else if (line.includes('Step') || line.includes('---') || line.includes('Building') || line.includes('Pulling')) className = 'text-blue-400'
                else if (line.startsWith('#') || line.includes('WARNING') || line.includes('warning')) className = 'text-yellow-400'

                return (
                    <div key={i} className={className}>{line}</div>
                )
            })}
        </>
    )
}

export function ComposeLogs({ projectId }: { projectId: string }) {
    const [tab, setTab] = useState<'runtime' | 'deploy'>('runtime')
    const scrollRef = useRef<HTMLDivElement>(null)

    const { data, error, isLoading } = useSWR(
        `/api/compose/${projectId}/logs?type=${tab}`,
        fetcher,
        { refreshInterval: 3000 }
    )

    // Auto-scroll to bottom when logs update
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [data])

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Button
                    variant={tab === 'runtime' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTab('runtime')}
                >
                    <Terminal className="mr-2 h-4 w-4" />
                    Stack Logs
                </Button>
                <Button
                    variant={tab === 'deploy' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTab('deploy')}
                >
                    <Hammer className="mr-2 h-4 w-4" />
                    Deploy Logs
                </Button>
            </div>

            <div ref={scrollRef} className="bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-xs p-4 h-[500px] overflow-auto whitespace-pre-wrap leading-5">
                {error ? (
                    <div className="text-red-500">Failed to load logs</div>
                ) : isLoading && !data ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="animate-spin text-zinc-500" />
                    </div>
                ) : (
                    <LogViewer
                        logs={data?.logs || ''}
                        emptyMessage={
                            tab === 'runtime'
                                ? 'No runtime logs available. Deploy the stack to see container output.'
                                : 'No deploy logs available. Deploy or rebuild the stack to see build output.'
                        }
                    />
                )}
            </div>
        </div>
    )
}
