
'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { saveComposeContent } from '@/lib/actions/compose-actions'
import { useRouter } from 'next/navigation'

export function ComposeEditor({ projectId, initialContent }: { projectId: string, initialContent: string }) {
    const [content, setContent] = useState(initialContent || 'services:\n  app:\n    image: nginx:alpine\n    ports:\n      - "8080:80"\n')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSave() {
        setLoading(true)
        try {
            const res = await saveComposeContent(projectId, content)
            if (res.success) {
                toast.success('Configuration saved')
                router.refresh()
            } else {
                toast.error(res.error)
            }
        } catch {
            toast.error('Save failed')
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
                    className="font-mono text-sm h-full resize-none bg-muted/50 dark:bg-[#1A1614] text-foreground"
                    placeholder="Paste your docker-compose.yml here..."
                />
            </CardContent>
            <CardFooter className="justify-between">
                <p className="text-xs text-muted-foreground">
                    Save to update configuration. Use Deploy Stack to start containers.
                </p>
                <Button onClick={handleSave} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
                </Button>
            </CardFooter>
        </Card>
    )
}
