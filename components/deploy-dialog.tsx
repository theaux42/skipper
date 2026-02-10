
'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { deployFromImage } from '@/lib/actions/deploy-actions'
import { deployFromGit } from '@/lib/actions/deploy-git'
import { GitHubPicker } from '@/components/github-picker'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DeployDialog({ projectId, trigger }: { projectId: string, trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        try {
            await deployFromImage(formData)
            setOpen(false)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    async function handleGitSubmit(formData: FormData) {
        setLoading(true)
        try {
            await deployFromGit(formData)
            setOpen(false)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Deploy Service
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Deploy New Service</DialogTitle>
                    <DialogDescription>
                        Deploy a container from a Docker image or Git repository.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="image" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="image">Docker Image</TabsTrigger>
                        <TabsTrigger value="git">Git Repository</TabsTrigger>
                    </TabsList>

                    <TabsContent value="image">
                        <form action={handleSubmit} className="grid gap-4">
                            <input type="hidden" name="projectId" value={projectId} />
                            <div className="grid gap-2">
                                <Label htmlFor="name">Service Name (a-z, 0-9, -)</Label>
                                <Input id="name" name="name" placeholder="my-app" required pattern="^[a-z0-9-]+$" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="image">Image</Label>
                                <Input id="image" name="image" placeholder="nginx:latest" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="env">Environment Variables (KEY=VALUE)</Label>
                                <Textarea id="env" name="env" placeholder="PORT=3000&#10;NODE_ENV=production" className="min-h-[100px] font-mono" />
                            </div>
                            <DialogFooter className="mt-4">
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Deploy
                                </Button>
                            </DialogFooter>
                        </form>
                    </TabsContent>

                    <TabsContent value="git">
                        <form action={handleGitSubmit} className="grid gap-4">
                            <input type="hidden" name="projectId" value={projectId} />
                            <div className="grid gap-2">
                                <Label htmlFor="git-name">Service Name (a-z, 0-9, -)</Label>
                                <Input id="git-name" name="name" placeholder="my-app" required pattern="^[a-z0-9-]+$" />
                            </div>

                            <GitHubPicker mode="DOCKERFILE" onSelect={(data) => {
                                const form = document.querySelector('form[action="javascript:void(0)"]') || document.getElementById('git-form') as HTMLFormElement
                                // Using ID for form to target inputs safely
                                if (document.getElementById('git-repo')) (document.getElementById('git-repo') as HTMLInputElement).value = data.repoUrl;
                                if (document.getElementById('git-branch')) (document.getElementById('git-branch') as HTMLInputElement).value = data.branch;
                                if (document.getElementById('git-path')) (document.getElementById('git-path') as HTMLInputElement).value = data.path;
                            }} />

                            {/* Hidden inputs populated by picker */}
                            <input type="hidden" id="git-repo" name="repoUrl" required />
                            <input type="hidden" id="git-branch" name="branch" required />
                            <input type="hidden" id="git-path" name="dockerfilePath" required />

                            <div className="grid gap-2">
                                <Label htmlFor="git-env">Environment Variables (KEY=VALUE)</Label>
                                <Textarea id="git-env" name="env" placeholder="PORT=3000&#10;NODE_ENV=production" className="min-h-[100px] font-mono" />
                            </div>
                            <DialogFooter className="mt-4">
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Deploy
                                </Button>
                            </DialogFooter>
                        </form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
