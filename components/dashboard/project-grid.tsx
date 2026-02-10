
'use client'

import { useState } from 'react'
import { ProjectCard } from '@/components/dashboard/project-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { Trash2, Play, Square, Layout } from 'lucide-react'
import { deleteProject, toggleProjectServices } from '@/lib/actions/project-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ProjectData {
    id: string
    name: string
    description: string | null
    updatedAt: string
    _count: { services: number }
}

export function ProjectGrid({ projects }: { projects: ProjectData[] }) {
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [bulkLoading, setBulkLoading] = useState(false)
    const router = useRouter()

    function toggleSelect(id: string) {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    async function handleBulkDelete() {
        if (!confirm(`Delete ${selected.size} project(s) and all their services?`)) return
        setBulkLoading(true)
        let count = 0
        for (const id of selected) {
            try {
                const res = await deleteProject(id)
                if (res.success) count++
            } catch { }
        }
        toast.success(`${count} project(s) deleted`)
        setSelected(new Set())
        setBulkLoading(false)
        router.refresh()
    }

    async function handleBulkToggle(action: 'start' | 'stop') {
        setBulkLoading(true)
        let total = 0
        for (const id of selected) {
            try {
                const res = await toggleProjectServices(id, action)
                if (res.success) total += res.count || 0
            } catch { }
        }
        toast.success(`${total} service(s) ${action}ed`)
        setBulkLoading(false)
        router.refresh()
    }

    return (
        <>
            {/* Bulk toolbar */}
            {selected.size > 0 && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-900/80 rounded-lg border border-zinc-800 animate-in slide-in-from-top duration-200">
                    <span className="text-sm text-zinc-400">{selected.size} selected</span>
                    <div className="flex gap-2 ml-auto">
                        <Button size="sm" variant="outline" onClick={() => handleBulkToggle('start')} disabled={bulkLoading}
                            className="h-8 text-emerald-400 border-emerald-800 hover:bg-emerald-900/30">
                            <Play className="w-3 h-3 mr-1" /> Start All
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleBulkToggle('stop')} disabled={bulkLoading}
                            className="h-8 text-amber-400 border-amber-800 hover:bg-amber-900/30">
                            <Square className="w-3 h-3 mr-1" /> Stop All
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleBulkDelete} disabled={bulkLoading}
                            className="h-8 text-red-400 border-red-800 hover:bg-red-900/30">
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}
                            className="h-8 text-zinc-400">
                            Clear
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                        selected={selected.has(project.id)}
                        onSelect={toggleSelect}
                    />
                ))}

                {projects.length === 0 && (
                    <Card className="col-span-full border-dashed border-2 bg-transparent">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                            <div className="p-4 bg-muted rounded-full">
                                <Layout className="h-8 w-8" />
                            </div>
                            <p>No projects found. Create one to get started.</p>
                            <CreateProjectDialog trigger={
                                <Button variant="outline">Create Project</Button>
                            } />
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    )
}
