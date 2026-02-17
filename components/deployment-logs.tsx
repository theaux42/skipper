
'use client'

import { useRef, useEffect } from 'react'
import useSWR from 'swr'
import { Loader2 } from 'lucide-react'
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

export function DeploymentLogs({ serviceId }: { serviceId: string }) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const { data, error, isLoading } = useSWR(`/api/services/${serviceId}/logs?type=build`, fetcher, {
        refreshInterval: 3000
    })

    // Auto-scroll to bottom when logs update
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [data])

    if (error) return <div className="text-red-500 p-4">Failed to load deployment logs</div>
    if (isLoading && !data) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>

    const logs = data?.logs || ''

    return (
        <div ref={scrollRef} className="bg-muted/50 dark:bg-[#1A1614] text-foreground font-mono text-xs p-4 rounded-sm border border-border h-[400px] overflow-auto whitespace-pre-wrap leading-5">
            {logs ? (
                logs.split('\n').map((line: string, i: number) => {
                    return (
                        <div key={i} className="text-foreground/80">
                            <AnsiLine text={line} />
                        </div>
                    )
                })
            ) : (
                <div className="text-muted-foreground flex items-center justify-center h-full">
                    No deployment logs available. Deploy the service to see build output.
                </div>
            )}
        </div>
    )
}
