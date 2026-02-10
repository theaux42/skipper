
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { RefreshCw, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
    getDomainValidationSettings,
    saveDomainValidationSettings,
    triggerDomainValidation
} from '@/lib/actions/domain-validation-actions'

export function DomainValidationSettings() {
    const [loading, setLoading] = useState(false)
    const [running, setRunning] = useState(false)
    const [enabled, setEnabled] = useState(false)
    const [interval, setInterval] = useState('24')
    const [lastRun, setLastRun] = useState<string | null>(null)

    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        try {
            const settings = await getDomainValidationSettings()
            setEnabled(settings.enabled)
            setInterval(settings.interval.toString())
            setLastRun(settings.lastRun)
        } catch { }
    }

    async function handleSave() {
        setLoading(true)
        try {
            const intervalHours = parseInt(interval)
            if (isNaN(intervalHours) || intervalHours < 1) {
                toast.error('Interval must be at least 1 hour')
                return
            }
            const res = await saveDomainValidationSettings(enabled, intervalHours)
            if (res.success) {
                toast.success('Settings saved')
                loadSettings()
            } else {
                toast.error(res.error)
            }
        } catch {
            toast.error('Failed to save')
        } finally {
            setLoading(false)
        }
    }

    async function handleRunNow() {
        setRunning(true)
        try {
            const res = await triggerDomainValidation()
            if (res.success) {
                toast.success(res.message || 'Validation completed')
                loadSettings()
            } else {
                toast.error(res.error)
            }
        } catch {
            toast.error('Validation failed')
        } finally {
            setRunning(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Domain Validation</CardTitle>
                <CardDescription>
                    Automatically check and sync domain records with Cloudflare to remove orphaned entries.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-0.5">
                        <Label className="text-base font-medium">Enable Automatic Validation</Label>
                        <p className="text-sm text-muted-foreground">
                            Periodically check that all domain records still exist in Cloudflare
                        </p>
                    </div>
                    <Switch
                        checked={enabled}
                        onCheckedChange={setEnabled}
                    />
                </div>

                {enabled && (
                    <div className="p-4 border rounded-lg bg-muted/50 space-y-4 animate-in slide-in-from-top duration-200">
                        <div className="space-y-2">
                            <Label htmlFor="interval" className="text-sm font-medium">
                                Check Interval (hours)
                            </Label>
                            <Input
                                id="interval"
                                type="number"
                                min="1"
                                value={interval}
                                onChange={(e) => setInterval(e.target.value)}
                                className="max-w-[200px] bg-background"
                            />
                            <p className="text-xs text-muted-foreground">
                                Validation will run every {interval} hour{interval === '1' ? '' : 's'}
                            </p>
                        </div>

                        {lastRun && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                Last run: {new Date(lastRun).toLocaleString()}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-3 pt-4 border-t">
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Settings
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleRunNow}
                        disabled={running}
                        className="gap-2"
                    >
                        {running ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Run Now
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
