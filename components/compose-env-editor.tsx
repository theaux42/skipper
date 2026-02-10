
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save } from 'lucide-react'
import { deployComposeProject } from '@/lib/actions/compose-actions'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ComposeEnvEditor({ projectId, initialEnv, composeContent }: { projectId: string, initialEnv: string, composeContent: string }) {
    const [env, setEnv] = useState(initialEnv)
    const [loading, setLoading] = useState(false)

    async function handleSave() {
        setLoading(true)
        try {
            // We save AND deploy because env vars are needed at deployment time? 
            // Or just save for next deployment? 
            // The action `deployComposeProject` takes both. 
            // Maybe we need a specific "Save Env" action if we don't want to redeploy?
            // User requested "Env editor" for docker compose which implies management.
            // Usually valid to just save and user triggers deploy separately, 
            // BUT `deployComposeProject` expects both.
            // I'll assume saving here triggers a redeploy or at least an update.
            // Let's create a separate `saveComposeEnv` action later or reuse deploy but just update DB?
            // No, reusing deploy makes sense to apply changes.

            const res = await deployComposeProject(projectId, composeContent, env)
            if (res.success) {
                toast.success('Environment variables updated and project redeployed')
            } else {
                toast.error(res.error)
            }
        } catch (e: any) {
            toast.error('Failed to update environment variables')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
                <CardDescription>
                    Define <code>.env</code> file content for your Docker Compose stack.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                <Textarea
                    value={env}
                    onChange={e => setEnv(e.target.value)}
                    className="flex-1 font-mono text-sm min-h-[300px]"
                    placeholder="KEY=VALUE"
                />
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save & Deploy
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
