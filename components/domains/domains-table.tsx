
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExternalLink, Trash2, Box, Globe, Plus, Loader2, X } from 'lucide-react'
import { unexposeService, addCustomDomain } from '@/lib/actions/expose-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'

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

    return (
        <div className="space-y-6">
            {/* Add Domain Form */}
            {showAddForm && (
                <Card className="border-blue-900/50 animate-in slide-in-from-top duration-200">
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
                                    <Label className="text-xs text-zinc-400">Protocol</Label>
                                    <select
                                        value={formData.protocol}
                                        onChange={e => setFormData(p => ({ ...p, protocol: e.target.value }))}
                                        className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-white mt-1"
                                    >
                                        <option value="https">HTTPS</option>
                                        <option value="http">HTTP</option>
                                        <option value="tcp">TCP</option>
                                        <option value="udp">UDP</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-3">
                                    <Label className="text-xs text-zinc-400">Hostname</Label>
                                    <Input
                                        value={formData.hostname}
                                        onChange={e => setFormData(p => ({ ...p, hostname: e.target.value }))}
                                        placeholder="app.mydomain.com"
                                        className="bg-zinc-900 border-zinc-700 h-9 mt-1"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-xs text-zinc-400">Target IP / Container</Label>
                                    <Input
                                        value={formData.targetIp}
                                        onChange={e => setFormData(p => ({ ...p, targetIp: e.target.value }))}
                                        placeholder="172.17.0.2 or container-name"
                                        className="bg-zinc-900 border-zinc-700 h-9 mt-1"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-zinc-400">Port</Label>
                                    <Input
                                        type="number"
                                        value={formData.port}
                                        onChange={e => setFormData(p => ({ ...p, port: e.target.value }))}
                                        placeholder="3000"
                                        className="bg-zinc-900 border-zinc-700 h-9 mt-1"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-zinc-400">Bind to Service (optional)</Label>
                                    <select
                                        value={formData.serviceId}
                                        onChange={e => setFormData(p => ({ ...p, serviceId: e.target.value }))}
                                        className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-white mt-1"
                                    >
                                        <option value="">Auto-detect</option>
                                        {services.map(s => (
                                            <option key={s.id} value={s.id}>{s.project.name} / {s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" size="sm" disabled={addLoading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white">
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
                            <Button size="sm" onClick={() => setShowAddForm(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="w-4 h-4 mr-1" /> Add Domain
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-zinc-800">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                                <tr>
                                    <th className="p-4 font-medium">Public URL</th>
                                    <th className="p-4 font-medium">Service</th>
                                    <th className="p-4 font-medium">Container</th>
                                    <th className="p-4 font-medium">Port</th>
                                    <th className="p-4 font-medium text-right">Actions</th>
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
                                        <tr key={d.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="w-4 h-4 text-blue-400" />
                                                    <span className="font-medium text-white">{d.fullUrl}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-zinc-300">{d.service.name}</span>
                                                    <Badge variant="secondary" className="text-xs">{d.service.project.name}</Badge>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant={d.service.status === 'RUNNING' ? 'default' : 'secondary'}
                                                    className={d.service.status === 'RUNNING' ? 'bg-emerald-500/10 text-emerald-500' : ''}>
                                                    {d.service.status}
                                                </Badge>
                                            </td>
                                            <td className="p-4 font-mono text-xs text-zinc-500">:{d.internalPort}</td>
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
