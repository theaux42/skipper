
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save } from 'lucide-react'
import { saveComposeContent } from '@/lib/actions/compose-actions'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export function ComposeEnvEditor({ projectId, initialEnv, composeContent }: { projectId: string, initialEnv: string, composeContent: string }) {
    const [env, setEnv] = useState(initialEnv)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSave() {
        setLoading(true)
        try {
            const res = await saveComposeContent(projectId, composeContent, env)
            if (res.success) {
                toast.success('Environment variables saved')
                router.refresh()
            } else {
                toast.error(res.error)
            }
        } catch (e: any) {
            toast.error('Failed to save environment variables')
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
                        Save
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
