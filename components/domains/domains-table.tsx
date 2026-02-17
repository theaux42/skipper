
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExternalLink, Trash2, Box, Globe, Plus, Loader2, X, Pencil, RefreshCw } from 'lucide-react'
import { unexposeService, addCustomDomain, updateExposedUrl, syncTunnelBindingsManual } from '@/lib/actions/expose-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface DomainEntry {
    id: string
    subdomain: string
    domainSuffix: string
    fullUrl: string
    internalPort: number
    tunnelId: string | null
    dnsRecordId: string | null
    serviceId: string
    service: {
        id: string
        name: string
        containerId: string | null
        status: string
        projectId: string
        project: {
            id: string
            name: string
        }
    }
}

export function DomainsTable({ domains, services }: { domains: DomainEntry[]; services: { id: string; name: string; projectId: string; project: { name: string } }[] }) {
    const [loading, setLoading] = useState<string | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [addLoading, setAddLoading] = useState(false)
    const [deleteDomainId, setDeleteDomainId] = useState<string | null>(null)
    const [deleteDomainUrl, setDeleteDomainUrl] = useState<string>('')
    const [editDomain, setEditDomain] = useState<DomainEntry | null>(null)
    const [editLoading, setEditLoading] = useState(false)
    const [syncLoading, setSyncLoading] = useState(false)
    const [editFormData, setEditFormData] = useState({
        subdomain: '',
        domainSuffix: '',
        port: '',
        serviceId: '',
    })
    const [formData, setFormData] = useState({
        hostname: '',
        protocol: 'https',
        targetIp: '',
        port: '',
        serviceId: '',
    })
    const router = useRouter()

    async function handleDelete() {
        if (!deleteDomainId) return
        setLoading(deleteDomainId)
        try {
            const res = await unexposeService(deleteDomainId)
            if (res.success) {
                toast.success('Domain removed')
                router.refresh()
            } else {
                toast.error(res.error)
            }
        } catch {
            toast.error('Failed to remove domain')
        } finally {
            setLoading(null)
        }
    }

    function handleEditOpen(domain: DomainEntry) {
        setEditDomain(domain)
        setEditFormData({
            subdomain: domain.subdomain,
            domainSuffix: domain.domainSuffix,
            port: domain.internalPort.toString(),
            serviceId: domain.serviceId,
        })
    }

    async function handleEditSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!editDomain) return
        setEditLoading(true)
        try {
            const res = await updateExposedUrl(editDomain.id, {
                subdomain: editFormData.subdomain,
                domainSuffix: editFormData.domainSuffix,
                port: parseInt(editFormData.port),
                serviceId: editFormData.serviceId,
            })
            if (res.success) {
                toast.success('Domain updated')
                setEditDomain(null)
                router.refresh()
            } else {
                toast.error(res.error || 'Failed to update domain')
            }
        } catch {
            toast.error('Failed to update domain')
        } finally {
            setEditLoading(false)
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        setAddLoading(true)
        try {
            const res = await addCustomDomain({
                hostname: formData.hostname,
                protocol: formData.protocol,
                targetIp: formData.targetIp,
                port: parseInt(formData.port),
                serviceId: formData.serviceId || undefined,
            })
            if (res.success) {
                toast.success('Domain added')
                setShowAddForm(false)
                setFormData({ hostname: '', protocol: 'https', targetIp: '', port: '', serviceId: '' })
                router.refresh()
            } else {
                toast.error(res.error)
            }
        } catch {
            toast.error('Failed to add domain')
        } finally {
            setAddLoading(false)
        }
    }

    async function handleSync() {
        setSyncLoading(true)
        try {
            const res = await syncTunnelBindingsManual()
            if (res.success) {
                toast.success('Synced tunnel bindings from Cloudflare')
                router.refresh()
            } else {
                toast.error(res.error || 'Sync failed')
            }
        } catch {
            toast.error('Failed to sync')
        } finally {
            setSyncLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Add Domain Form */}
            {showAddForm && (
                <Card className="border-border animate-in slide-in-from-top duration-200">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Add Custom Domain</CardTitle>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAddForm(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAdd} className="grid gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div>
                                    <Label>Protocol</Label>
                                    <select
                                        value={formData.protocol}
                                        onChange={e => setFormData(p => ({ ...p, protocol: e.target.value }))}
                                        className="flex h-9 w-full rounded-sm border border-border bg-transparent px-3 py-1 text-sm font-sans mt-1"
                                    >
                                        <option value="https">HTTPS</option>
                                        <option value="http">HTTP</option>
                                        <option value="tcp">TCP</option>
                                        <option value="udp">UDP</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-3">
                                    <Label>Hostname</Label>
                                    <Input
                                        value={formData.hostname}
                                        onChange={e => setFormData(p => ({ ...p, hostname: e.target.value }))}
                                        placeholder="app.mydomain.com"
                                        className="mt-1 border-b-border font-sans text-sm"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <Label>Target IP / Container</Label>
                                    <Input
                                        value={formData.targetIp}
                                        onChange={e => setFormData(p => ({ ...p, targetIp: e.target.value }))}
                                        placeholder="172.17.0.2 or container-name"
                                        className="mt-1 border-b-border font-sans text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Port</Label>
                                    <Input
                                        type="number"
                                        value={formData.port}
                                        onChange={e => setFormData(p => ({ ...p, port: e.target.value }))}
                                        placeholder="3000"
                                        className="mt-1 border-b-border font-sans text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Bind to Service (optional)</Label>
                                    <select
                                        value={formData.serviceId}
                                        onChange={e => setFormData(p => ({ ...p, serviceId: e.target.value }))}
                                        className="flex h-9 w-full rounded-sm border border-border bg-transparent px-3 py-1 text-sm font-sans mt-1"
                                    >
                                        <option value="">Auto-detect</option>
                                        {services.map(s => (
                                            <option key={s.id} value={s.id}>{s.project.name} / {s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" size="sm" disabled={addLoading}>
                                    {addLoading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                    Add Domain
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Domains Table */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Domain Bindings</CardTitle>
                            <CardDescription>{domains.length} domain{domains.length !== 1 ? 's' : ''} configured</CardDescription>
                        </div>
                        {!showAddForm && (
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={handleSync} disabled={syncLoading}>
                                    <RefreshCw className={`w-4 h-4 mr-1 ${syncLoading ? 'animate-spin' : ''}`} /> Sync
                                </Button>
                                <Button size="sm" onClick={() => setShowAddForm(true)}>
                                    <Plus className="w-4 h-4 mr-1" /> Add Domain
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-sm border border-border">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-accent border-b border-border">
                                <tr>
                                    <th className="p-4 label-ui">Public URL</th>
                                    <th className="p-4 label-ui">Service</th>
                                    <th className="p-4 label-ui">Container</th>
                                    <th className="p-4 label-ui">Port</th>
                                    <th className="p-4 label-ui text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {domains.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            No domains configured. Add one above or expose a service from its settings page.
                                        </td>
                                    </tr>
                                ) : (
                                    domains.map((d) => (
                                        <tr key={d.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="w-4 h-4 text-bronze" />
                                                    <span className="font-medium text-foreground">{d.fullUrl}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-foreground/80">{d.service.name}</span>
                                                    <Badge variant="secondary" className="text-xs">{d.service.project.name}</Badge>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant={d.service.status === 'RUNNING' ? 'default' : 'secondary'}
                                                    className={d.service.status === 'RUNNING' ? 'bg-emerald-500/10 text-emerald-500' : ''}>
                                                    {d.service.status}
                                                </Badge>
                                            </td>
                                            <td className="p-4 font-mono text-xs text-muted-foreground">:{d.internalPort}</td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <a href={`https://${d.fullUrl}`} target="_blank" rel="noopener noreferrer">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </Button>
                                                    </a>
                                                    <Link href={`/projects/${d.service.projectId}/services/${d.serviceId}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Box className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleEditOpen(d)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-400 hover:text-red-300"
                                                        onClick={() => {
                                                            setDeleteDomainId(d.id)
                                                            setDeleteDomainUrl(d.fullUrl)
                                                        }}
                                                        disabled={loading === d.id}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={editDomain !== null} onOpenChange={(open) => !open && setEditDomain(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Domain</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Subdomain</Label>
                                <Input
                                    value={editFormData.subdomain}
                                    onChange={e => setEditFormData(p => ({ ...p, subdomain: e.target.value }))}
                                    placeholder="app"
                                    className="mt-1 border-b-border font-sans text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Domain Suffix</Label>
                                <Input
                                    value={editFormData.domainSuffix}
                                    onChange={e => setEditFormData(p => ({ ...p, domainSuffix: e.target.value }))}
                                    placeholder="example.com"
                                    className="mt-1 border-b-border font-sans text-sm"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Internal Port</Label>
                                <Input
                                    type="number"
                                    value={editFormData.port}
                                    onChange={e => setEditFormData(p => ({ ...p, port: e.target.value }))}
                                    placeholder="3000"
                                    className="mt-1 border-b-border font-sans text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Target Service</Label>
                                <select
                                    value={editFormData.serviceId}
                                    onChange={e => setEditFormData(p => ({ ...p, serviceId: e.target.value }))}
                                    className="flex h-9 w-full rounded-sm border border-border bg-transparent px-3 py-1 text-sm font-sans mt-1"
                                    required
                                >
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.project.name} / {s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setEditDomain(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editLoading}>
                                {editLoading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <DeleteConfirmationDialog
                open={deleteDomainId !== null}
                onOpenChange={(open) => !open && setDeleteDomainId(null)}
                onConfirm={handleDelete}
                itemName={deleteDomainUrl}
                itemType="domain"
                description="This will remove the domain binding and delete the DNS record. This action cannot be undone."
                requireExactMatch={false}
            />
        </div>
    )
}
