
'use client'

import useSWR from 'swr'
import { Progress } from "@/components/ui/progress"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ServiceStats({ serviceId }: { serviceId: string }) {
  const { data, error, isLoading } = useSWR(`/api/services/${serviceId}/stats`, fetcher, {
    refreshInterval: 2000
  })

  // Mock max RAM derived from quota or fixed?
  // Docker stats return usage in bytes.
  // We can show raw bytes or percentage of limit.
  
  if (error) return <div className="text-red-500">Failed to load stats</div>
  if (isLoading || !data) return <div className="animate-pulse h-20 bg-zinc-800 rounded-lg"></div>

  if (data.status !== 'RUNNING') {
      return (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                <div className="text-zinc-400 text-sm mb-2">CPU Usage</div>
                <div className="text-2xl font-bold text-zinc-600">--</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                <div className="text-zinc-400 text-sm mb-2">Memory Usage</div>
                <div className="text-2xl font-bold text-zinc-600">--</div>
            </div>
          </div>
      )
  }

  const cpu = data.cpu ? data.cpu.toFixed(2) : '0.00'
  const mem = data.memory ? (data.memory / 1024 / 1024).toFixed(0) : '0'
  const memLimit = data.memoryLimit ? (data.memoryLimit / 1024 / 1024).toFixed(0) : '0'
  const memPercent = data.memoryPercent || 0

  return (
    <div className="grid grid-cols-2 gap-4">
       <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
           <div className="flex justify-between items-center mb-2">
                <div className="text-zinc-400 text-sm">CPU Usage</div>
                <div className="text-xs text-zinc-500">{cpu}%</div>
           </div>
           <Progress value={Math.min(data.cpu, 100)} className="h-2 bg-zinc-800" />
           <div className="mt-2 text-2xl font-bold text-white">{cpu}%</div>
       </div>
       <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
           <div className="flex justify-between items-center mb-2">
                <div className="text-zinc-400 text-sm">Memory Usage</div>
                <div className="text-xs text-zinc-500">{mem} / {memLimit} MB</div>
           </div>
           <Progress value={Math.min(memPercent, 100)} className="h-2 bg-zinc-800" />
           <div className="mt-2 text-2xl font-bold text-white">{mem} MB</div>
       </div>
    </div>
  )
}
