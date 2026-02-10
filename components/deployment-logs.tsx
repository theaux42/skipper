
'use client'

import useSWR from 'swr'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function DeploymentLogs({ serviceId }: { serviceId: string }) {
    const { data, error, isLoading } = useSWR(`/api/services/${serviceId}/logs?type=build`, fetcher, {
        refreshInterval: 3000
    })

    if (error) return <div className="text-red-500 p-4">Failed to load deployment logs</div>
    if (isLoading && !data) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>

    const logs = data?.logs || ''

    return (
        <div className="bg-zinc-950 text-amber-300/80 font-mono text-xs p-4 rounded-md h-[400px] overflow-auto whitespace-pre-wrap leading-5">
            {logs ? (
                logs.split('\n').map((line: string, i: number) => {
                    // Color code different types of lines
                    let className = 'text-amber-300/80'
                    if (line.includes('Step') || line.includes('---')) className = 'text-blue-400'
                    if (line.includes('ERROR') || line.includes('error')) className = 'text-red-400'
                    if (line.includes('Successfully') || line.includes('DONE')) className = 'text-emerald-400'
                    if (line.startsWith('#')) className = 'text-zinc-500'

                    return (
                        <div key={i} className={className}>{line}</div>
                    )
                })
            ) : (
                <div className="text-zinc-500 flex items-center justify-center h-full">
                    No deployment logs available. Deploy the service to see build output.
                </div>
            )}
        </div>
    )
}
