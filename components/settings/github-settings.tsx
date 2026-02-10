
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Save, CheckCircle, XCircle } from "lucide-react"
import { checkGitHubToken, saveGitHubToken } from '@/lib/actions/github-actions'

export function GitHubSettings() {
    const [token, setToken] = useState('')
    const [configured, setConfigured] = useState(false)
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        checkGitHubToken().then(res => {
            setConfigured(res.configured)
            setChecking(false)
        })
    }, [])

    async function handleSave() {
        setLoading(true)
        try {
            await saveGitHubToken(token)
            setConfigured(!!token)
            toast.success('GitHub token updated')
            setToken('')
        } catch (e: any) {
            toast.error('Failed to save token')
        } finally {
            setLoading(false)
        }
    }

    if (checking) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle>GitHub Integration</CardTitle>
                <CardDescription>Configure access to import private repositories and browse code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                        {configured ? <CheckCircle className="text-emerald-500 w-5 h-5" /> : <XCircle className="text-muted-foreground w-5 h-5" />}
                        <div>
                            <h3 className="font-medium">Connection Status</h3>
                            <p className="text-sm text-muted-foreground">
                                {configured ? 'Connected to GitHub API' : 'Not configured'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="gh-token">Personal Access Token (PAT)</Label>
                    <div className="flex gap-2">
                        <Input
                            id="gh-token"
                            type="password"
                            placeholder={configured ? "••••••••••••••••••••" : "ghp_..."}
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                        />
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Token requires <code>repo</code> scope to access private repositories.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
