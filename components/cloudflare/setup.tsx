
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { getCloudflareSettings, saveCloudflareToken, saveBaseDomain, listCloudflareZones } from '@/lib/actions/cloudflare-actions'
import { toast } from 'sonner'

export function CloudflareSetup() {
    const [loading, setLoading] = useState(false)
    const [token, setToken] = useState('')
    const [accountId, setAccountId] = useState('')
    const [baseDomain, setBaseDomain] = useState('')
    const [zones, setZones] = useState<{ id: string, name: string }[]>([])
    const [step, setStep] = useState(1) // 1: Token, 2: Domain

    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        const settings = await getCloudflareSettings()
        if (settings.token) setToken(settings.token)
        if (settings.accountId) {
            setAccountId(settings.accountId)
            fetchZones()
            if (settings.baseDomain) {
                setBaseDomain(settings.baseDomain)
                setStep(2)
            } else {
                setStep(2)
            }
        }
    }

    async function fetchZones() {
        const z = await listCloudflareZones()
        setZones(z)
    }

    async function handleTokenSubmit() {
        setLoading(true)
        try {
            const res = await saveCloudflareToken(token)
            if (res.success) {
                setAccountId(res.accountId || '')
                toast.success("Connected to Cloudflare")
                await fetchZones()
                setStep(2)
            } else {
                toast.error(res.error)
            }
        } catch (e) {
            toast.error("Failed to connect")
        } finally {
            setLoading(false)
        }
    }

    async function handleDomainSave() {
        setLoading(true)
        try {
            await saveBaseDomain(baseDomain)
            toast.success("Base Domain Saved")
        } catch (e) {
            toast.error("Failed to save domain")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cloudflare Configuration</CardTitle>
                <CardDescription>Connect your Cloudflare account to enable automated tunnel management.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</div>
                        <div>
                            <h3 className="font-medium">API Token</h3>
                            <p className="text-sm text-muted-foreground">Requires Account:Read, Tunnel:Edit, Zone:Read permissions.</p>
                        </div>
                    </div>

                    <div className="pl-10 space-y-4">
                        <div className="grid gap-2">
                            <Label>Token</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    value={token}
                                    onChange={e => setToken(e.target.value)}
                                    placeholder="Cloudflare API Token"
                                    disabled={step > 1 && !!accountId}
                                />
                                {step === 1 && (
                                    <Button onClick={handleTokenSubmit} disabled={loading}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Connect
                                    </Button>
                                )}
                                {step > 1 && <Button variant="ghost" size="icon"><CheckCircle className="text-green-500" /></Button>}
                            </div>
                        </div>
                        {accountId && (
                            <div className="text-sm text-muted-foreground">
                                Connected Account ID: <span className="font-mono text-xs">{accountId}</span>
                            </div>
                        )}
                    </div>
                </div>

                {step >= 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</div>
                            <div>
                                <h3 className="font-medium">Base Domain</h3>
                                <p className="text-sm text-muted-foreground">Select a zone to use for default subdomains.</p>
                            </div>
                        </div>

                        <div className="pl-10 space-y-4">
                            <div className="grid gap-2">
                                <Label>Domain</Label>
                                <div className="flex gap-2">
                                    <Select value={baseDomain} onValueChange={setBaseDomain}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a domain" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {zones.map(z => (
                                                <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleDomainSave} disabled={loading}>Save</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </CardContent>
        </Card>
    )
}
