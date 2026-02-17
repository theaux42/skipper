
'use client'

import { useState } from 'react'
import { exposeService, unexposeService } from '@/lib/actions/expose-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Globe, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'

export function ExposeServiceForm({ service }: { service: any }) {
    const [loading, setLoading] = useState(false)
    const [deleteUrlId, setDeleteUrlId] = useState<string | null>(null)
    const [deleteUrl, setDeleteUrl] = useState<string>('')

    const handleExpose = async (formData: FormData) => {
        setLoading(true)
        formData.append('serviceId', service.id)
        try {
            const result = await exposeService(formData)
            if (result.success) {
                toast.success('Service exposed successfully')
            } else {
                toast.error(result.error)
            }
        } catch (e) {
            toast.error('Failed to expose service')
        } finally {
            setLoading(false)
        }
    }

    const handleUnexpose = async () => {
        if (!deleteUrlId) return
        setLoading(true)
        try {
            const result = await unexposeService(deleteUrlId)
            if (result.success) {
                toast.success('URL removed')
            } else {
                toast.error(result.error)
            }
        } catch (e) {
            toast.error('Failed to remove URL')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-card p-4 rounded-sm border border-border">
                <h3 className="font-serif font-medium mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-bronze" />
                    Exposed URLs
                </h3>

                {service.exposedUrls.length > 0 ? (
                    <div className="space-y-2 mb-6">
                        {service.exposedUrls.map((url: any) => (
                            <div key={url.id} className="flex justify-between items-center bg-accent p-2 rounded-sm border border-border">
                                <a href={`https://${url.fullUrl}`} target="_blank" className="text-blue-400 hover:underline text-sm">
                                    https://{url.fullUrl}
                                </a>
                                <Button variant="ghost" size="sm"
                                    onClick={() => {
                                        setDeleteUrlId(url.id)
                                        setDeleteUrl(url.fullUrl)
                                        setLoading(false) // Ensure we can open dialog
                                    }}
                                    disabled={loading}>
                                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm mb-4">No public URLs configured.</p>
                )}

                <form action={handleExpose} className="grid gap-4 border-t border-border pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <Label className="text-xs">Subdomain</Label>
                            <Input name="subdomain" placeholder="app" className="mt-1" required />
                        </div>
                        <div className="col-span-1">
                            <Label className="text-xs">Domain</Label>
                            <Input name="domainSuffix" placeholder="example.com" className="mt-1" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <Label className="text-xs">Internal Port</Label>
                            <Input name="port" type="number" placeholder="3000" className="mt-1" required />
                        </div>
                        <div className="col-span-1 flex items-end">
                            <Button type="submit" size="sm" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                Add URL
                            </Button>
                        </div>
                    </div>
                </form>
            </div>

            <DeleteConfirmationDialog
                open={deleteUrlId !== null}
                onOpenChange={(open) => !open && setDeleteUrlId(null)}
                onConfirm={handleUnexpose}
                itemName={deleteUrl}
                itemType="public URL"
                description="This will remove the public URL and delete the DNS record. This action cannot be undone."
                requireExactMatch={false}
            />
        </div>
    )
}
