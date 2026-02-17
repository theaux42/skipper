
'use client'

import { useState } from 'react'
import { setupPanelTunnel } from '@/lib/actions/tunnel-setup'
import { Button } from '@/components/ui/button'
import { Loader2, CloudLightning } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function TunnelSetup({ }: {}) {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

    const handleSetup = async () => {
        setLoading(true)
        try {
            const result = await setupPanelTunnel()
            if (result.success) {
                toast.success(result.message)
                setStatus('success')
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
        <div className="bg-card border border-border p-6 rounded-sm mb-8">
            <h2 className="text-xl font-serif mb-4 flex items-center gap-2">
                <CloudLightning className="w-5 h-5 text-bronze" />
                Cloudflare Tunnel
            </h2>

            <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                    Connect your server to the internet securely without port forwarding.
                </p>

                <Button onClick={handleSetup} disabled={loading} className="w-full sm:w-auto">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Initialize Tunnel
                </Button>

                {status === 'success' && (
                    <Alert className="bg-green-900/20 border-green-900 text-green-400">
                        <CloudLightning className="h-4 w-4" />
                        <AlertTitle>Connected</AlertTitle>
                        <AlertDescription>
                            Your tunnel is active and ready to route traffic.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    )
}
