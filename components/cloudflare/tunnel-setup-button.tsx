
'use client'

import { useState, useEffect } from 'react'
import { setupPanelTunnel } from '@/lib/actions/tunnel-setup'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CloudLightning, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export function TunnelSetupButton() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'checking' | 'running' | 'stopped' | 'error'>('checking')

    useEffect(() => {
        checkTunnelStatus()
    }, [])

    async function checkTunnelStatus() {
        try {
            const res = await fetch('/api/status/system')
            const data = await res.json()
            if (data.cloudflared?.running) {
                setStatus('running')
            } else {
                setStatus('stopped')
            }
        } catch {
            setStatus('stopped')
        }
    }

    const handleSetup = async () => {
        setLoading(true)
        try {
            const result = await setupPanelTunnel()
            if (result.success) {
                toast.success(result.message)
                setStatus('running')
            } else {
                toast.error(result.error)
                setStatus('error')
            }
        } catch (e) {
            toast.error('Failed to setup tunnel')
            setStatus('error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <CloudLightning className="w-5 h-5 text-orange-500" />
                    <CardTitle>Tunnel Setup</CardTitle>
                </div>
                <CardDescription>
                    Initialize and start the Cloudflare Tunnel connector (cloudflared) to route traffic to your services.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {status === 'checking' ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking tunnel status...
                    </div>
                ) : status === 'running' ? (
                    <div className="flex items-center gap-3">
                        <Button disabled className="bg-emerald-900/30 border-emerald-700 text-emerald-400 cursor-default">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Tunnel Running
                        </Button>
                        <span className="text-sm text-emerald-500">
                            Cloudflared is active and routing traffic.
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={handleSetup}
                            disabled={loading}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Initialize Tunnel
                        </Button>
                        {status === 'error' && (
                            <span className="text-sm text-red-400">Setup failed. Check logs.</span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
