
'use client'

import { useState } from 'react'
import { Play, Square, RotateCw, Trash } from 'lucide-react'
import { serviceAction } from '@/lib/actions/service-actions'
import { deleteService } from '@/lib/actions/service-delete'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner' // Using sonner as requested

interface ServiceHeaderProps {
  serviceId: string
  status: string
  projectId: string
  name: string
}

export function ServiceHeader({ serviceId, status, projectId, name }: ServiceHeaderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setLoading(true)
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
        setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) return

    setLoading(true)
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
        setLoading(false)
    }
  }

  return (
    <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-6 rounded-lg mb-6">
        <div className="flex items-center gap-4">
             {/* Status Dot */}
             <div className={`w-3 h-3 rounded-full ${getStatusColor(status)} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
             <div>
                <h1 className="text-2xl font-bold text-white">{name}</h1>
                <div className="text-sm text-zinc-400 capitalize">{status.toLowerCase()}</div>
             </div>
        </div>

        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAction('start')} 
                disabled={loading || status === 'RUNNING'}
                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
            >
                <Play className="w-4 h-4 mr-2 text-green-500" /> Start
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAction('stop')} 
                disabled={loading || status === 'STOPPED'}
                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
            >
                <Square className="w-4 h-4 mr-2 text-red-500" /> Stop
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAction('restart')} 
                disabled={loading}
                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
            >
                <RotateCw className="w-4 h-4 mr-2 text-blue-500" /> Restart
            </Button>
             <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDelete} 
                disabled={loading}
            >
                <Trash className="w-4 h-4" />
            </Button>
        </div>
    </div>
  )
}

function getStatusColor(status: string) {
    switch (status) {
        case 'RUNNING': return 'bg-green-500'
        case 'STOPPED': return 'bg-zinc-500'
        case 'ERROR': return 'bg-red-500'
        case 'STARTING': return 'bg-yellow-500'
        case 'BUILDING': return 'bg-blue-500'
        default: return 'bg-zinc-500'
    }
}
