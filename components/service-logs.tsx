
'use client'

import useSWR from 'swr'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ServiceLogs({ serviceId }: { serviceId: string }) {
    const { data, error, isLoading } = useSWR(`/api/services/${serviceId}/logs`, fetcher, {
        refreshInterval: 5000
    })

    // Basic rendering
    if (error) return <div className="text-red-500">Failed to load logs</div>
    if (isLoading && !data) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>

    return (
        <div className="bg-black text-green-400 font-mono text-xs p-4 rounded-md h-[400px] overflow-auto whitespace-pre-wrap">
            {typeof data?.logs === 'string' ? data.logs : JSON.stringify(data)}
        </div>
    )
}
