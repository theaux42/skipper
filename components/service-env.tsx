
'use client'

import { useState } from 'react'
import { addEnvVar, deleteEnvVar } from '@/lib/actions/env-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ServiceEnv({ serviceId, envs }: { serviceId: string, envs: any[] }) {
    const [loading, setLoading] = useState(false)

    const handleAdd = async (formData: FormData) => {
        setLoading(true)
        formData.append('serviceId', serviceId)
        try {
            const result = await addEnvVar(formData)
            if (result.success) {
                toast.success('Environment variable saved. Restart service to apply.')
                // Reset form? logic hard with server action specific form...
                // Simple:
                const form = document.getElementById('add-env-form') as HTMLFormElement
                form.reset()
            } else {
                toast.error(result.error)
            }
        } catch (e) {
            toast.error('Failed to save')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        setLoading(true)
        try {
            await deleteEnvVar(id, serviceId)
            toast.success('Deleted. Restart service to apply.')
        } catch (e) {
            toast.error('Failed to delete')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                <div className="space-y-2 mb-6">
                    {envs.map((env) => (
                        <div key={env.id} className="flex gap-2 items-center">
                            <Input value={env.key} readOnly className="bg-zinc-900 border-zinc-800 text-zinc-400 w-1/3" />
                            <Input value={env.value} readOnly className="bg-zinc-900 border-zinc-800 text-zinc-400 flex-1" type="password" />
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(env.id)} disabled={loading}>
                                <Trash2 className="w-4 h-4 text-zinc-500 hover:text-red-400" />
                            </Button>
                        </div>
                    ))}
                    {envs.length === 0 && <p className="text-zinc-500 text-sm">No environment variables.</p>}
                </div>

                <form id="add-env-form" action={handleAdd} className="flex gap-2 border-t border-zinc-800 pt-4">
                    <Input name="key" placeholder="KEY" className="bg-zinc-900 border-zinc-700 w-1/3" required />
                    <Input name="value" placeholder="VALUE" className="bg-zinc-900 border-zinc-700 flex-1" required />
                    <Button type="submit" size="icon" className="bg-white text-black hover:bg-zinc-200" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                </form>
            </div>
            <p className="text-xs text-amber-500">
                Note: Changes will not take effect until you restart the service.
            </p>
        </div>
    )
}
