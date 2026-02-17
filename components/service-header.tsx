
'use client'

import { useState } from 'react'
import { Play, Square, RotateCw, Trash2, Loader2 } from 'lucide-react'
import { serviceAction } from '@/lib/actions/service-actions'
import { deleteService } from '@/lib/actions/service-delete'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'

interface ServiceHeaderProps {
    serviceId: string
    status: string
    projectId: string
    name: string
}

export function ServiceHeader({ serviceId, status, projectId, name }: ServiceHeaderProps) {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    const isLoading = loading !== null

    const handleAction = async (action: 'start' | 'stop' | 'restart') => {
        setLoading(action)
        try {
            const result = await serviceAction(serviceId, action)
            if (result.success) {
                toast.success(`Service ${action}ed successfully`)
                router.refresh()
            } else {
                toast.error(`Failed to ${action} service: ${result.error}`)
            }
        } catch (e) {
            toast.error('An error occurred')
        } finally {
            setLoading(null)
        }
    }

    const handleDelete = async () => {
        setLoading('delete')
        try {
            const result = await deleteService(serviceId)
            if (result.success) {
                toast.success('Service deleted')
                router.push(`/projects/${projectId}`)
            } else {
                toast.error(`Failed to delete service: ${result.error}`)
            }
        } catch (e) {
            console.error(e)
            toast.error('An error occurred')
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="heading-display text-4xl">{name}</h1>
                    <Badge variant="outline" className={`${getStatusTextColor(status)} border-current`}>
                        {status}
                    </Badge>
                </div>
                <p className="text-muted-foreground mt-2 text-body">Service in project</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('start')}
                    disabled={isLoading || status === 'RUNNING'}
                >
                    {loading === 'start' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Start
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('stop')}
                    disabled={isLoading || status === 'STOPPED'}
                >
                    {loading === 'stop' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                    Stop
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('restart')}
                    disabled={isLoading}
                >
                    {loading === 'restart' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
                    Restart
                </Button>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isLoading}
                >
                    {loading === 'delete' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete
                </Button>
            </div>

            <DeleteConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={name}
                itemType="service"
                description="This will permanently delete the service and all its data. This action cannot be undone."
            />
        </div>
    )
}

function getStatusTextColor(status: string) {
    switch (status) {
        case 'RUNNING': return 'text-emerald-600 dark:text-emerald-500'
        case 'STOPPED': return 'text-muted-foreground'
        case 'ERROR': return 'text-destructive'
        case 'STARTING': return 'text-amber-600 dark:text-amber-500'
        case 'BUILDING': return 'text-bronze'
        case 'DEPLOYING': return 'text-bronze'
        default: return 'text-muted-foreground'
    }
}
