
'use client'

import { useState } from 'react'
import { Loader2, ExternalLink, Github, BookOpen, Globe, Rocket, Tag } from 'lucide-react'
import { deployTemplate } from '@/lib/actions/template-actions'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface TemplateMeta {
    id: string
    name: string
    version: string
    description: string
    logo: string
    links: { github?: string; website?: string; docs?: string }
    tags: string[]
}

export function TemplateDeployDialog({
    template,
    open,
    onOpenChange
}: {
    template: TemplateMeta
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const [projectName, setProjectName] = useState(template.name)
    const [deploying, setDeploying] = useState(false)

    const handleDeploy = async () => {
        if (!projectName.trim()) {
            toast.error('Project name is required')
            return
        }

        setDeploying(true)
        try {
            const result = await deployTemplate(template.id, projectName.trim())
            // If redirect didn't happen, it means there was an error
            if (result && !result.success) {
                toast.error(result.error || 'Deployment failed')
                setDeploying(false)
            }
        } catch (e: any) {
            // NEXT_REDIRECT is expected when redirect() is called
            if (e?.digest?.includes('NEXT_REDIRECT')) {
                // This is the expected redirect, do nothing
                return
            }
            toast.error('Deployment failed')
            setDeploying(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 rounded-xl bg-muted/80 flex items-center justify-center overflow-hidden border border-muted-foreground/10 shrink-0">
                            <img
                                src={`/api/templates/${template.id}/logo`}
                                alt={template.name}
                                className="w-10 h-10 object-contain"
                                onError={e => {
                                    (e.target as HTMLImageElement).style.display = 'none'
                                }}
                            />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">{template.name}</DialogTitle>
                            <DialogDescription className="mt-0.5">
                                Version {template.version}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {template.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                        {template.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                            </Badge>
                        ))}
                    </div>

                    {/* Links */}
                    <div className="flex gap-3 pt-1">
                        {template.links?.github && (
                            <a
                                href={template.links.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                            >
                                <Github className="w-3.5 h-3.5" /> GitHub
                            </a>
                        )}
                        {template.links?.website && (
                            <a
                                href={template.links.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                            >
                                <Globe className="w-3.5 h-3.5" /> Website
                            </a>
                        )}
                        {template.links?.docs && (
                            <a
                                href={template.links.docs}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                            >
                                <BookOpen className="w-3.5 h-3.5" /> Docs
                            </a>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-muted-foreground/10" />

                    {/* Project Name */}
                    <div className="space-y-2">
                        <Label htmlFor="project-name">Project Name</Label>
                        <Input
                            id="project-name"
                            value={projectName}
                            onChange={e => setProjectName(e.target.value)}
                            placeholder="My App"
                            disabled={deploying}
                        />
                        <p className="text-xs text-muted-foreground">
                            A new Compose project will be created with this name.
                        </p>
                    </div>

                    {/* Info box */}
                    <div className="bg-muted/50 rounded-lg p-3 border border-muted-foreground/10">
                        <p className="text-xs text-muted-foreground">
                            <strong className="text-foreground">What happens next:</strong> The template's Docker Compose stack will be deployed automatically.
                            Environment variables and secrets will be generated. If a default domain is configured, a public URL will be created automatically.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={deploying}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeploy}
                        disabled={deploying}
                        className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                        {deploying ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deploying...
                            </>
                        ) : (
                            <>
                                <Rocket className="mr-2 h-4 w-4" />
                                Deploy
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
