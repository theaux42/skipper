
'use client'

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { Loader2, Terminal, Hammer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseAnsi } from '@/lib/ansi-parser'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function AnsiLine({ text }: { text: string }) {
    const segments = parseAnsi(text)
    return (
        <>
            {segments.map((seg, j) => (
                <span key={j} style={seg.style}>{seg.text}</span>
            ))}
        </>
    )
}

function LogViewer({ logs, emptyMessage }: { logs: string; emptyMessage: string }) {
    if (!logs) {
        return (
            <div className="text-muted-foreground flex items-center justify-center h-full">
                {emptyMessage}
            </div>
        )
    }

    return (
        <>
            {logs.split('\n').map((line: string, i: number) => (
                <div key={i} className="text-foreground/80">
                    <AnsiLine text={line} />
                </div>
            ))}
        </>
    )
}

export function ServiceLogs({ serviceId }: { serviceId: string }) {
    const [tab, setTab] = useState<'runtime' | 'deploy'>('runtime')
    const scrollRef = useRef<HTMLDivElement>(null)

    const url = tab === 'runtime'
        ? `/api/services/${serviceId}/logs`
        : `/api/services/${serviceId}/logs?type=build`

    const { data, error, isLoading } = useSWR(url, fetcher, {
        refreshInterval: 3000
    })

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
                    Runtime Logs
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

            <div ref={scrollRef} className="bg-muted/50 dark:bg-[#1A1614] border border-border rounded-sm font-mono text-xs p-4 h-[500px] overflow-auto whitespace-pre-wrap leading-5 text-foreground">
                {error ? (
                    <div className="text-red-500">Failed to load logs</div>
                ) : isLoading && !data ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <LogViewer
                        logs={data?.logs || ''}
                        emptyMessage={
                            tab === 'runtime'
                                ? 'No runtime logs available. Start the service to see container output.'
                                : 'No deploy logs available. Deploy the service to see build output.'
                        }
                    />
                )}
            </div>
        </div>
    )
}
