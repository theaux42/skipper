
'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function RingChart({ percent, color, label, detail }: { percent: number; color: string; label: string; detail: string }) {
    const r = 40
    const circumference = 2 * Math.PI * r
    const offset = circumference - (percent / 100) * circumference

    return (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="relative w-[100px] h-[100px] flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8"
                        className="text-zinc-800" />
                    <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{Math.round(percent)}%</span>
                </div>
            </div>
            <div>
                <p className="font-medium text-white text-sm">{label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{detail}</p>
            </div>
        </div>
    )
}

function BarMetric({ label, value1, label1, value2, label2, color1, color2 }: {
    label: string; value1: string; label1: string; value2: string; label2: string; color1: string; color2: string
}) {
    return (
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <p className="font-medium text-white text-sm mb-3">{label}</p>
            <div className="space-y-3">
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">{label1}</span>
                        <span className="text-zinc-300 font-mono">{value1}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: '60%', background: color1 }} />
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">{label2}</span>
                        <span className="text-zinc-300 font-mono">{value2}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: '40%', background: color2 }} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export function SystemGraphs() {
    const { data, error } = useSWR('/api/status/system', fetcher, { refreshInterval: 10000, dedupingInterval: 8000 })

    if (error) return null
    if (!data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-[130px] rounded-xl border border-zinc-800 bg-zinc-900/50 animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <RingChart
                percent={data.cpu?.percent || 0}
                color="#3b82f6"
                label="CPU Usage"
                detail={`${data.cpu?.cores || 0} cores`}
            />
            <RingChart
                percent={data.memory?.percent || 0}
                color="#8b5cf6"
                label="Memory"
                detail={`${formatBytes(data.memory?.used || 0)} / ${formatBytes(data.memory?.total || 0)}`}
            />
            <RingChart
                percent={data.disk?.percent || 0}
                color="#f59e0b"
                label="Disk Usage"
                detail={`${formatBytes(data.disk?.used || 0)} / ${formatBytes(data.disk?.total || 0)}`}
            />
            <BarMetric
                label="Network I/O"
                value1={formatBytes(data.network?.rx || 0)}
                label1="Download (RX)"
                value2={formatBytes(data.network?.tx || 0)}
                label2="Upload (TX)"
                color1="#06b6d4"
                color2="#14b8a6"
            />
        </div>
    )
}
