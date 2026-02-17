
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
  if (isLoading || !data) return <div className="animate-pulse h-20 bg-card rounded-sm border border-border"></div>

  if (data.status !== 'RUNNING') {
      return (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border p-4 rounded-sm">
                <div className="text-muted-foreground text-sm mb-2 label-ui">CPU Usage</div>
                <div className="text-2xl font-serif text-muted-foreground">--</div>
            </div>
            <div className="bg-card border border-border p-4 rounded-sm">
                <div className="text-muted-foreground text-sm mb-2 label-ui">Memory Usage</div>
                <div className="text-2xl font-serif text-muted-foreground">--</div>
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
       <div className="bg-card border border-border p-4 rounded-sm">
           <div className="flex justify-between items-center mb-2">
                <div className="text-muted-foreground text-sm label-ui">CPU Usage</div>
                <div className="text-xs text-muted-foreground">{cpu}%</div>
           </div>
           <Progress value={Math.min(data.cpu, 100)} className="h-1.5" />
           <div className="mt-2 text-2xl font-serif text-foreground">{cpu}%</div>
       </div>
       <div className="bg-card border border-border p-4 rounded-sm">
           <div className="flex justify-between items-center mb-2">
                <div className="text-muted-foreground text-sm label-ui">Memory Usage</div>
                <div className="text-xs text-muted-foreground">{mem} / {memLimit} MB</div>
           </div>
           <Progress value={Math.min(memPercent, 100)} className="h-1.5" />
           <div className="mt-2 text-2xl font-serif text-foreground">{mem} MB</div>
       </div>
    </div>
  )
}
