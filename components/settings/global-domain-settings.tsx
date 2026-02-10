
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getGlobalDomainSettings, saveGlobalDomainSettings } from '@/lib/actions/system-settings-actions'

export function GlobalDomainSettings() {
    const [loading, setLoading] = useState(false)
    const [panelDomain, setPanelDomain] = useState('')
    const [defaultDomain, setDefaultDomain] = useState('')

    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        try {
            const settings = await getGlobalDomainSettings()
            setPanelDomain(settings.panelDomain)
            setDefaultDomain(settings.defaultDeployDomain)
        } catch { }
    }

    async function handleSave() {
        setLoading(true)
        try {
            const res = await saveGlobalDomainSettings({
                panelDomain,
                defaultDeployDomain: defaultDomain
            })
            if (res.success) {
                toast.success('Domain settings saved')
            } else {
                toast.error(res.error)
            }
        } catch {
            toast.error('Failed to save settings')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Global Domain Settings</CardTitle>
                <CardDescription>Configure default domains for the panel and new deployments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="panel-domain">Panel Domain</Label>
                    <Input
                        id="panel-domain"
                        placeholder="panel.example.com"
                        value={panelDomain}
                        onChange={(e) => setPanelDomain(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        The public domain used to access this panel.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="default-domain">Default Deployment Base Domain</Label>
                    <Input
                        id="default-domain"
                        placeholder="apps.example.com"
                        value={defaultDomain}
                        onChange={(e) => setDefaultDomain(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Used as the default suffix when adding custom domains to services.
                    </p>
                </div>

                <div className="pt-2">
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
