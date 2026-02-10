
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { listCloudflareTunnels } from '@/lib/actions/cloudflare-actions'
import { Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function TunnelsList() {
    const [tunnels, setTunnels] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadv()
    }, [])

    async function loadv() {
        setLoading(true)
        try {
            const data = await listCloudflareTunnels()
            setTunnels(data)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Tunnels</CardTitle>
                        <CardDescription>Active Cloudflare Tunnels.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadv} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-zinc-800">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                            <tr>
                                <th className="p-4 font-medium">Name</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">ID</th>
                                <th className="p-4 font-medium">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tunnels.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        No tunnels found.
                                    </td>
                                </tr>
                            ) : (
                                tunnels.map((t) => (
                                    <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                                        <td className="p-4 font-medium text-white">{t.name}</td>
                                        <td className="p-4">
                                            <Badge variant={t.status === 'healthy' ? 'default' : 'secondary'} className={t.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : ''}>
                                                {t.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4 font-mono text-xs text-zinc-500">{t.id}</td>
                                        <td className="p-4 text-zinc-400">{new Date(t.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
