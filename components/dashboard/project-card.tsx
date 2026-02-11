
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
        <Card className={`h-full transition-colors border-zinc-800 relative group
            ${selected ? 'ring-2 ring-blue-500 bg-blue-950/10' : 'hover:bg-zinc-900/50'}`}>
            {/* Checkbox */}
            <div className="absolute top-3 left-3 z-10">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onSelect(project.id)}
                    className="rounded border-zinc-600 bg-zinc-800 cursor-pointer"
                />
            </div>

            {/* Menu */}
            <div className="absolute top-3 right-3 z-10">
                <div className="relative">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white"
                        onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen) }}>
                        <MoreVertical className="w-4 h-4" />
                    </Button>
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-8 z-40 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 w-44 animate-in fade-in zoom-in-95 duration-100">
                                <button className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                                    onClick={(e) => { e.preventDefault(); setRenaming(true); setMenuOpen(false) }}>
                                    <Pencil className="w-3.5 h-3.5" /> Rename
                                </button>
                                <button className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                                    onClick={(e) => { e.preventDefault(); handleToggle('start') }} disabled={loading}>
                                    <Play className="w-3.5 h-3.5 text-emerald-500" /> Start All
                                </button>
                                <button className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                                    onClick={(e) => { e.preventDefault(); handleToggle('stop') }} disabled={loading}>
                                    <Square className="w-3.5 h-3.5 text-amber-500" /> Stop All
                                </button>
                                <div className="border-t border-zinc-800 my-1" />
                                <button className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 flex items-center gap-2"
                                    onClick={(e) => { e.preventDefault(); setDeleteDialogOpen(true); setMenuOpen(false) }} disabled={loading}>
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <Link href={`/projects/${project.id}`} className={renaming ? 'pointer-events-none' : ''}>
                <CardHeader className="pt-10">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1">
                            {renaming ? (
                                <div className="flex gap-2" onClick={e => e.preventDefault()}>
                                    <Input
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="h-8 bg-zinc-900 border-zinc-700 text-sm"
                                        autoFocus
                                        onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
                                    />
                                    <Button size="icon" className="h-8 w-8" onClick={handleRename} disabled={loading}>
                                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setRenaming(false)}>
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            ) : (
                                <CardTitle className="text-xl">{project.name}</CardTitle>
                            )}
                            <CardDescription className="line-clamp-2">
                                {project.description || "No description provided."}
                            </CardDescription>
                        </div>
                        <div className="p-2 bg-primary/10 rounded-full text-primary ml-4">
                            <Layout className="h-4 w-4" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                        {project._count.services} Active Services
                    </div>
                </CardContent>
                <CardFooter className="text-xs text-zinc-500 border-t border-zinc-900/50 pt-4 mt-auto">
                    Last updated <span suppressHydrationWarning>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </CardFooter>
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
