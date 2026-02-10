
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, Cloud, Server, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ServiceData {
    id: string
    name: string
    status: string
    containerId: string | null
    uptime: string
    project: { id: string; name: string }
    exposedUrls: { id: string; fullUrl: string }[]
}

interface UrlCheck {
    id: string
    url: string
    serviceName: string
    reachable: boolean
    statusCode: number
}

interface SystemData {
    docker: boolean
    cloudflared: { running: boolean; uptime: string; status: string }
}

export function StatusDashboard({ services }: { services: ServiceData[] }) {
    const [system, setSystem] = useState<SystemData | null>(null)
    const [urlChecks, setUrlChecks] = useState<UrlCheck[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        try {
            const [sysRes, checkRes] = await Promise.all([
                fetch('/api/status/system').then(r => r.json()),
                fetch('/api/status/check').then(r => r.json()),
            ])
            setSystem(sysRes)
            setUrlChecks(checkRes.checks || [])
        } catch { }
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            {/* System Components */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">System Components</CardTitle>
                    <Button variant="ghost" size="icon" onClick={loadData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading && !system ? (
                        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                                <div className="flex items-center gap-3">
                                    <Server className="h-5 w-5 text-zinc-400" />
                                    <div>
                                        <p className="font-medium text-sm">Docker Daemon</p>
                                        <p className="text-xs text-zinc-500">Container runtime</p>
                                    </div>
                                </div>
                                {system?.docker ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-0">Healthy</Badge>
                                ) : (
                                    <Badge className="bg-red-500/10 text-red-500 border-0">Unreachable</Badge>
                                )}
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                                <div className="flex items-center gap-3">
                                    <Cloud className="h-5 w-5 text-orange-400" />
                                    <div>
                                        <p className="font-medium text-sm">Cloudflare Tunnel</p>
                                        <p className="text-xs text-zinc-500">{system?.cloudflared?.uptime || 'Not running'}</p>
                                    </div>
                                </div>
                                {system?.cloudflared?.running ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-0">Active</Badge>
                                ) : (
                                    <Badge className="bg-zinc-500/10 text-zinc-400 border-0">Inactive</Badge>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Services Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Services ({services.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-zinc-800">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                                <tr>
                                    <th className="p-3 text-left font-medium">Service</th>
                                    <th className="p-3 text-left font-medium">Project</th>
                                    <th className="p-3 text-left font-medium">Status</th>
                                    <th className="p-3 text-left font-medium">Uptime</th>
                                    <th className="p-3 text-left font-medium">URLs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {services.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-6 text-center text-zinc-500">No services deployed</td>
                                    </tr>
                                ) : (
                                    services.map((s) => (
                                        <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${getStatusDotColor(s.status)}`} />
                                                    <span className="font-medium text-white">{s.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-zinc-400">{s.project.name}</td>
                                            <td className="p-3">
                                                <Badge variant="outline" className={`${getStatusTextColor(s.status)} border-current text-xs`}>
                                                    {s.status}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-zinc-400 font-mono text-xs">{s.uptime || '—'}</td>
                                            <td className="p-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {s.exposedUrls.length === 0 ? (
                                                        <span className="text-zinc-600 text-xs">None</span>
                                                    ) : (
                                                        s.exposedUrls.map((url) => {
                                                            const check = urlChecks.find(c => c.id === url.id)
                                                            return (
                                                                <div key={url.id} className="flex items-center gap-1">
                                                                    {check ? (
                                                                        check.reachable ? (
                                                                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                                                                        ) : (
                                                                            <XCircle className="w-3 h-3 text-red-500" />
                                                                        )
                                                                    ) : (
                                                                        <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />
                                                                    )}
                                                                    <span className="text-xs text-zinc-400">{url.fullUrl}</span>
                                                                </div>
                                                            )
                                                        })
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function getStatusDotColor(status: string) {
    switch (status) {
        case 'RUNNING': return 'bg-emerald-500'
        case 'STOPPED': return 'bg-zinc-500'
        case 'ERROR': return 'bg-red-500'
        case 'BUILDING': return 'bg-blue-500'
        default: return 'bg-zinc-500'
    }
}

function getStatusTextColor(status: string) {
    switch (status) {
        case 'RUNNING': return 'text-emerald-500'
        case 'STOPPED': return 'text-zinc-500'
        case 'ERROR': return 'text-red-500'
        case 'BUILDING': return 'text-blue-500'
        default: return 'text-zinc-500'
    }
}
