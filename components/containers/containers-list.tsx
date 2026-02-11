
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Square, RotateCw, Trash2, Wrench, Settings, CheckSquare, XSquare, Loader2 } from 'lucide-react'
import { serviceAction } from '@/lib/actions/service-actions'
import { bulkContainerAction, rebuildService } from '@/lib/actions/container-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'

interface ServiceData {
    id: string
    name: string
    status: string
    containerId: string | null
    imageName: string | null
    sourceType: string
    createdAt: string
    updatedAt: string
    projectId: string
    project: { id: string; name: string }
}

export function ContainersList({ services }: { services: ServiceData[] }) {
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState<string | null>(null)
    const [bulkLoading, setBulkLoading] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const router = useRouter()

    const selectionMode = selected.size > 0

    function toggleSelect(id: string) {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function toggleSelectAll() {
        if (selected.size === services.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(services.map(s => s.id)))
        }
    }

    async function handleAction(serviceId: string, action: 'start' | 'stop' | 'restart') {
        setLoading(serviceId)
        try {
            const res = await serviceAction(serviceId, action)
            if (res.success) {
                toast.success(`Service ${action}ed`)
                router.refresh()
            } else toast.error(res.error)
        } catch { toast.error('Action failed') }
        finally { setLoading(null) }
    }

    async function handleRebuild(serviceId: string) {
        setLoading(serviceId)
        try {
            const res = await rebuildService(serviceId)
            if (res.success) {
                toast.success('Rebuild started')
                router.refresh()
            } else toast.error(res.error)
        } catch { toast.error('Rebuild failed') }
        finally { setLoading(null) }
    }

    async function handleBulkAction(action: 'start' | 'stop' | 'delete') {
        if (action === 'delete') {
            setDeleteDialogOpen(true)
            return
        }
        setBulkLoading(true)
        try {
            const res = await bulkContainerAction(Array.from(selected), action)
            if (res.success) {
                toast.success(`${res.affected} service(s) ${action}ed`)
                setSelected(new Set())
                router.refresh()
            }
        } catch { toast.error('Bulk action failed') }
        finally { setBulkLoading(false) }
    }

    async function handleBulkDelete() {
        setBulkLoading(true)
        try {
            const res = await bulkContainerAction(Array.from(selected), 'delete')
            if (res.success) {
                toast.success(`${res.affected} service(s) deleted`)
                setSelected(new Set())
                router.refresh()
            }
        } catch { toast.error('Bulk action failed') }
        finally { setBulkLoading(false) }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{services.length} Container{services.length !== 1 ? 's' : ''}</CardTitle>
                    {selectionMode && (
                        <div className="flex items-center gap-2 animate-in fade-in duration-200">
                            <span className="text-sm text-zinc-400">{selected.size} selected</span>
                            <Button size="sm" variant="outline" onClick={() => handleBulkAction('start')} disabled={bulkLoading}
                                className="h-8 text-emerald-400 border-emerald-800 hover:bg-emerald-900/30">
                                <Play className="w-3 h-3 mr-1" /> Start
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBulkAction('stop')} disabled={bulkLoading}
                                className="h-8 text-amber-400 border-amber-800 hover:bg-amber-900/30">
                                <Square className="w-3 h-3 mr-1" /> Stop
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')} disabled={bulkLoading}
                                className="h-8 text-red-400 border-red-800 hover:bg-red-900/30">
                                <Trash2 className="w-3 h-3 mr-1" /> Delete
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}
                                className="h-8 text-zinc-400">
                                <XSquare className="w-3 h-3 mr-1" /> Clear
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-zinc-800">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                            <tr>
                                <th className="p-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selected.size === services.length && services.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-zinc-600 bg-zinc-800"
                                    />
                                </th>
                                <th className="p-3 text-left font-medium">Name</th>
                                <th className="p-3 text-left font-medium">Project</th>
                                <th className="p-3 text-left font-medium">Image</th>
                                <th className="p-3 text-left font-medium">Status</th>
                                <th className="p-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-zinc-500">No containers found</td>
                                </tr>
                            ) : (
                                services.map((s) => {
                                    const isLoading = loading === s.id || bulkLoading
                                    return (
                                        <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(s.id)}
                                                    onChange={() => toggleSelect(s.id)}
                                                    className="rounded border-zinc-600 bg-zinc-800"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${getStatusDot(s.status)}`} />
                                                    <span className="font-medium text-white">{s.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="secondary" className="text-xs">{s.project.name}</Badge>
                                            </td>
                                            <td className="p-3 font-mono text-xs text-zinc-500 max-w-[200px] truncate">
                                                {s.imageName || s.sourceType}
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="outline" className={`${getStatusColor(s.status)} border-current text-xs`}>
                                                    {s.status}
                                                </Badge>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                                        onClick={() => handleAction(s.id, 'start')}
                                                        disabled={isLoading || s.status === 'RUNNING'}
                                                        title="Start">
                                                        <Play className="w-3.5 h-3.5 text-emerald-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                                        onClick={() => handleAction(s.id, 'stop')}
                                                        disabled={isLoading || s.status === 'STOPPED'}
                                                        title="Stop">
                                                        <Square className="w-3.5 h-3.5 text-amber-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                                        onClick={() => handleAction(s.id, 'restart')}
                                                        disabled={isLoading}
                                                        title="Restart">
                                                        <RotateCw className="w-3.5 h-3.5 text-blue-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                                        onClick={() => handleRebuild(s.id)}
                                                        disabled={isLoading}
                                                        title="Rebuild">
                                                        <Wrench className="w-3.5 h-3.5 text-purple-400" />
                                                    </Button>
                                                    <Link href={`/projects/${s.projectId}/services/${s.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7"
                                                            disabled={selectionMode}
                                                            title="Manage">
                                                            <Settings className="w-3.5 h-3.5 text-zinc-400" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>

            <DeleteConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleBulkDelete}
                itemName={`${selected.size} service(s)`}
                itemType="services"
                description={`This will permanently delete ${selected.size} service(s). This action cannot be undone.`}
                requireExactMatch={false}
            />
        </Card>
    )
}

function getStatusDot(status: string) {
    switch (status) {
        case 'RUNNING': return 'bg-emerald-500'
        case 'STOPPED': return 'bg-zinc-500'
        case 'ERROR': return 'bg-red-500'
        case 'BUILDING': return 'bg-blue-500'
        default: return 'bg-zinc-500'
    }
}

function getStatusColor(status: string) {
    switch (status) {
        case 'RUNNING': return 'text-emerald-500'
        case 'STOPPED': return 'text-zinc-500'
        case 'ERROR': return 'text-red-500'
        case 'BUILDING': return 'text-blue-500'
        default: return 'text-zinc-500'
    }
}
