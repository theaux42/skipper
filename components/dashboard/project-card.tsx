
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Layout, MoreVertical, Pencil, Trash2, Play, Square, Check, X, Loader2 } from 'lucide-react'
import { renameProject, deleteProject, toggleProjectServices } from '@/lib/actions/project-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'

interface ProjectData {
    id: string
    name: string
    description: string | null
    updatedAt: string
    services: { status: string }[]
    _count: { services: number }
}

export function ProjectCard({ project, selected, onSelect }: {
    project: ProjectData
    selected: boolean
    onSelect: (id: string) => void
}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [renaming, setRenaming] = useState(false)
    const [newName, setNewName] = useState(project.name)
    const [loading, setLoading] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const router = useRouter()

    async function handleRename() {
        if (!newName.trim()) return
        setLoading(true)
        try {
            const res = await renameProject(project.id, newName)
            if (res.success) {
                toast.success('Project renamed')
                setRenaming(false)
                router.refresh()
            } else toast.error(res.error)
        } catch { toast.error('Failed') }
        finally { setLoading(false) }
    }

    async function handleDelete() {
        setLoading(true)
        try {
            const res = await deleteProject(project.id)
            if (res.success) {
                toast.success('Project deleted')
                router.refresh()
            } else toast.error(res.error)
        } catch { toast.error('Failed') }
        finally { setLoading(false) }
    }

    async function handleToggle(action: 'start' | 'stop') {
        setLoading(true)
        try {
            const res = await toggleProjectServices(project.id, action)
            if (res.success) {
                toast.success(`${res.count} service(s) ${action}ed`)
                router.refresh()
            } else toast.error(res.error)
        } catch { toast.error('Failed') }
        finally { setLoading(false); setMenuOpen(false) }
    }

    return (
        <Card className={`group relative overflow-hidden transition-all duration-200 ${selected ? 'ring-1 ring-bronze' : 'hover:shadow-sm'}`}>
            <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onSelect(project.id)}
                    className="rounded-sm border-border bg-background cursor-pointer w-4 h-4"
                    onClick={e => e.stopPropagation()}
                />
            </div>

            <div className="absolute top-3 right-3 z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => { e.preventDefault(); setMenuOpen(!menuOpen) }}
                >
                    <MoreVertical className="w-3.5 h-3.5" />
                </Button>

                {menuOpen && (
                    <>
                        <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                        <div className="absolute right-0 top-7 z-30 bg-card border border-border rounded-sm py-1 min-w-[140px] shadow-lg">
                            <button
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent flex items-center gap-2"
                                onClick={e => { e.preventDefault(); setRenaming(true); setMenuOpen(false) }}
                            >
                                <Pencil className="w-3 h-3" /> Rename
                            </button>
                            <button
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent flex items-center gap-2"
                                onClick={e => { e.preventDefault(); handleToggle('start') }}
                                disabled={loading}
                            >
                                <Play className="w-3 h-3 text-emerald-500" /> Start All
                            </button>
                            <button
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent flex items-center gap-2"
                                onClick={e => { e.preventDefault(); handleToggle('stop') }}
                                disabled={loading}
                            >
                                <Square className="w-3 h-3 text-amber-500" /> Stop All
                            </button>
                            <div className="h-px bg-border my-1" />
                            <button
                                className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-accent flex items-center gap-2"
                                onClick={e => { e.preventDefault(); setDeleteDialogOpen(true); setMenuOpen(false) }}
                                disabled={loading}
                            >
                                <Trash2 className="w-3 h-3" /> Delete
                            </button>
                        </div>
                    </>
                )}
            </div>

            <Link href={`/projects/${project.id}`} className={renaming ? 'pointer-events-none' : ''}>
                <div className="p-5">
                    {renaming ? (
                        <div className="flex gap-2 mb-3" onClick={e => { e.preventDefault(); e.stopPropagation() }}>
                            <Input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="h-7 text-sm"
                                autoFocus
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleRename()
                                    if (e.key === 'Escape') setRenaming(false)
                                }}
                            />
                            <Button size="icon" className="h-7 w-7" onClick={handleRename} disabled={loading}>
                                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRenaming(false)}>
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <h3 className="font-serif text-base mb-1.5 pr-8">{project.name}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                                {project.description || "No description"}
                            </p>
                        </>
                    )}

                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                            {(() => {
                                const runningCount = project.services.filter(s => s.status === 'RUNNING').length
                                const stoppedCount = project.services.filter(s => ['STOPPED', 'ERROR'].includes(s.status)).length
                                return (
                                    <>
                                        {runningCount > 0 && (
                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <span>{runningCount}</span>
                                            </div>
                                        )}
                                        {stoppedCount > 0 && (
                                            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                <span>{stoppedCount}</span>
                                            </div>
                                        )}
                                        {project._count.services === 0 && (
                                            <span className="text-muted-foreground">0 services</span>
                                        )}
                                    </>
                                )
                            })()}
                        </div>
                        <time className="text-muted-foreground/60" suppressHydrationWarning>
                            {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </time>
                    </div>
                </div>
            </Link>

            <DeleteConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={project.name}
                itemType="project"
                description="This will permanently delete the project and all its services. This action cannot be undone."
            />
        </Card>
    )
}
