
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Loader2, Trash2, Power } from "lucide-react"
import { getSettings, updateSetting, systemCommand } from '@/lib/actions/settings-actions'
import { CloudflareSetup } from '@/components/cloudflare/setup'
import { TunnelsList } from '@/components/cloudflare/tunnels-list'
import { TunnelSetupButton } from '@/components/cloudflare/tunnel-setup-button'
import { DomainValidationSettings } from '@/components/settings/domain-validation-settings'
import { GlobalDomainSettings } from '@/components/settings/global-domain-settings'
import { GitHubSettings } from '@/components/settings/github-settings'

export default function SettingsPage() {
    const [loading, setLoading] = useState(false)
    const [settings, setSettings] = useState<Record<string, string>>({})

    useEffect(() => {
        getSettings().then(setSettings)
    }, [])

    const handleCommand = async (cmd: 'prune-images' | 'prune-containers' | 'restart-panel') => {
        setLoading(true)
        try {
            const res = await systemCommand(cmd)
            if (res.success) toast.success(res.message)
            else toast.error(res.error)
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
            <p className="text-muted-foreground mb-8">Manage system configuration and integrations.</p>

            <Tabs defaultValue="system" className="w-full space-y-6">
                <TabsList className="bg-muted/50">
                    <TabsTrigger value="system">System</TabsTrigger>
                    <TabsTrigger value="domains">Domains</TabsTrigger>
                    <TabsTrigger value="integrations">Integrations</TabsTrigger>
                    <TabsTrigger value="cloudflare">Cloudflare</TabsTrigger>
                </TabsList>

                <TabsContent value="system">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Maintenance</CardTitle>
                            <CardDescription>Perform cleanup and system operations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                                <div>
                                    <h3 className="font-medium">Prune Unused Images</h3>
                                    <p className="text-sm text-muted-foreground">Remove all dangling images to free space.</p>
                                </div>
                                <Button variant="outline" onClick={() => handleCommand('prune-images')} disabled={loading}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Prune
                                </Button>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                                <div>
                                    <h3 className="font-medium">Restart Panel</h3>
                                    <p className="text-sm text-muted-foreground">Restart the application process.</p>
                                </div>
                                <Button variant="destructive" onClick={() => handleCommand('restart-panel')} disabled={loading}>
                                    <Power className="mr-2 h-4 w-4" />
                                    Restart
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="domains" className="space-y-6">
                    <GlobalDomainSettings />
                    <DomainValidationSettings />
                </TabsContent>

                <TabsContent value="integrations" className="space-y-6">
                    <GitHubSettings />
                </TabsContent>

                <TabsContent value="cloudflare" className="space-y-6">
                    <CloudflareSetup />
                    <TunnelSetupButton />
                    <TunnelsList />
                </TabsContent>
            </Tabs>
        </div>
    )
}
