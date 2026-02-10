
'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Play, Save } from 'lucide-react'
import { toast } from 'sonner'
import { deployComposeProject } from '@/lib/actions/compose-actions'

export function ComposeEditor({ projectId, initialContent }: { projectId: string, initialContent: string }) {
    const [content, setContent] = useState(initialContent || 'services:\n  app:\n    image: nginx:alpine\n    ports:\n      - "8080:80"\n')
    const [loading, setLoading] = useState(false)

    async function handleDeploy() {
        setLoading(true)
        try {
            const res = await deployComposeProject(projectId, content)
            if (res.success) {
                toast.success('Project deployed successfully')
            } else {
                toast.error(res.error)
            }
        } catch {
            toast.error('Deployment failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Docker Compose Configuration</CardTitle>
                <CardDescription>Define your multi-container application.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[400px]">
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="font-mono text-sm h-full resize-none bg-zinc-950 text-zinc-100"
                    placeholder="Paste your docker-compose.yml here..."
                />
            </CardContent>
            <CardFooter className="justify-between">
                <p className="text-xs text-muted-foreground">
                    Changes are applied immediately upon deployment.
                </p>
                <Button onClick={handleDeploy} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Deploy / Redeploy
                </Button>
            </CardFooter>
        </Card>
    )
}
