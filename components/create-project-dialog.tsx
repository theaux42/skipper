
'use client'

import { useState } from 'react'
import { Plus, Github, Loader2 } from 'lucide-react'
import { createProject } from '@/lib/actions/project-actions'
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

export function CreateProjectDialog({ trigger }: { trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [type, setType] = useState('STANDARD')
    const [source, setSource] = useState('BLANK') // BLANK, GITHUB
    const [creating, setCreating] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Project</DialogTitle>
                    <DialogDescription>
                        Create a new project to organize your services.
                    </DialogDescription>
                </DialogHeader>
                <form action={async (formData) => {
                    setCreating(true)
                    try {
                        await createProject(formData)
                        setOpen(false)
                    } catch {
                        setCreating(false)
                    }
                }} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" placeholder="My Awesome Project" required disabled={creating} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea id="description" name="description" placeholder="What is this project about?" disabled={creating} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Project Type</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => !creating && setType('STANDARD')}
                                className={`cursor-pointer border rounded-md p-4 flex flex-col items-center gap-2 hover:bg-muted ${type === 'STANDARD' ? 'border-primary bg-primary/5' : ''} ${creating ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="font-semibold">Standard</div>
                                <div className="text-xs text-center text-muted-foreground w-full">Single containers managed individually</div>
                            </div>
                            <div
                                onClick={() => !creating && setType('COMPOSE')}
                                className={`cursor-pointer border rounded-md p-4 flex flex-col items-center gap-2 hover:bg-muted ${type === 'COMPOSE' ? 'border-primary bg-primary/5' : ''} ${creating ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="font-semibold">Docker Compose</div>
                                <div className="text-xs text-center text-muted-foreground w-full">Multi-container stack defined by YAML</div>
                            </div>
                        </div>
                        <input type="hidden" name="type" value={type} />
                    </div>

                    {type === 'COMPOSE' && (
                        <div className="grid gap-2">
                            <Label>Source</Label>
                            <Tabs value={source} onValueChange={setSource} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="BLANK" disabled={creating}>Blank Project</TabsTrigger>
                                    <TabsTrigger value="GITHUB" disabled={creating}>Import from GitHub</TabsTrigger>
                                </TabsList>
                                <TabsContent value="BLANK">
                                    <p className="text-sm text-muted-foreground pt-2">
                                        Start with an empty project. You can paste your <code>docker-compose.yml</code> later.
                                    </p>
                                </TabsContent>
                                <TabsContent value="GITHUB">
                                    <div className="pt-2">
                                        <GitHubPicker mode="COMPOSE" onSelect={(data) => {
                                            if (document.getElementById('cp-repo')) (document.getElementById('cp-repo') as HTMLInputElement).value = data.repoUrl;
                                            if (document.getElementById('cp-branch')) (document.getElementById('cp-branch') as HTMLInputElement).value = data.branch;
                                            if (document.getElementById('cp-path')) (document.getElementById('cp-path') as HTMLInputElement).value = data.path;
                                        }} />
                                        <input type="hidden" id="cp-repo" name="gitRepoUrl" />
                                        <input type="hidden" id="cp-branch" name="gitBranch" />
                                        <input type="hidden" id="cp-path" name="gitComposePath" />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={creating}>
                            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {creating ? 'Creating...' : 'Create Project'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

