
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Tag, ExternalLink, Loader2, LayoutGrid, ChevronRight, X, Globe, Github, BookOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TemplateDeployDialog } from '@/components/template-deploy-dialog'

interface TemplateMeta {
    id: string
    name: string
    version: string
    description: string
    logo: string
    links: { github?: string; website?: string; docs?: string }
    tags: string[]
}

const POPULAR_TAGS = [
    'self-hosted', 'database', 'monitoring', 'ai', 'automation',
    'media', 'security', 'productivity', 'analytics', 'cms'
]

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<TemplateMeta[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeTag, setActiveTag] = useState<string | null>(null)
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null)

    useEffect(() => {
        fetch('/api/templates')
            .then(res => res.json())
            .then(data => {
                setTemplates(Array.isArray(data) ? data : [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const filtered = useMemo(() => {
        let result = templates

        if (search) {
            const q = search.toLowerCase()
            result = result.filter(t =>
                t.name.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.id.toLowerCase().includes(q) ||
                t.tags.some(tag => tag.toLowerCase().includes(q))
            )
        }

        if (activeTag) {
            result = result.filter(t =>
                t.tags.some(tag => tag.toLowerCase() === activeTag.toLowerCase())
            )
        }

        return result
    }, [templates, search, activeTag])

    // Collect all unique tags for the tag cloud
    const allTags = useMemo(() => {
        const tagCounts: Record<string, number> = {}
        templates.forEach(t => t.tags?.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
        }))
        return Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([tag]) => tag)
    }, [templates])

    return (
        <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20">
                        <LayoutGrid className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Template Store</h1>
                        <p className="text-muted-foreground">Deploy self-hosted apps in one click. {templates.length} templates available.</p>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="mb-6 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search templates by name, tag, or description..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 h-11 bg-muted/50 border-muted-foreground/20 focus:border-violet-500/50"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                        <Badge
                            key={tag}
                            variant={activeTag === tag ? 'default' : 'outline'}
                            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${activeTag === tag
                                ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600'
                                : 'hover:bg-muted hover:border-violet-500/30'
                                }`}
                            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                        >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Results Count */}
            {(search || activeTag) && (
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {filtered.length} of {templates.length} templates
                        {activeTag && (
                            <span className="ml-2">
                                · Tag: <Badge variant="secondary" className="ml-1">{activeTag} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setActiveTag(null)} /></Badge>
                            </span>
                        )}
                    </p>
                    {(search || activeTag) && (
                        <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setActiveTag(null) }}>
                            Clear filters
                        </Button>
                    )}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                    <span className="ml-3 text-muted-foreground">Loading templates...</span>
                </div>
            )}

            {/* Empty State */}
            {!loading && filtered.length === 0 && (
                <Card className="border-dashed border-2 bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                        <div className="p-4 bg-muted rounded-full">
                            <Search className="h-8 w-8" />
                        </div>
                        <p>No templates found matching your search.</p>
                        <Button variant="outline" onClick={() => { setSearch(''); setActiveTag(null) }}>
                            Clear Filters
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Template Grid */}
            {!loading && filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(template => (
                        <Card
                            key={template.id}
                            className="group hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 cursor-pointer overflow-hidden"
                            onClick={() => setSelectedTemplate(template)}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-muted/80 flex items-center justify-center overflow-hidden shrink-0 border border-muted-foreground/10">
                                        <img
                                            src={`/api/templates/${template.id}/logo`}
                                            alt={template.name}
                                            className="w-8 h-8 object-contain"
                                            onError={e => {
                                                (e.target as HTMLImageElement).style.display = 'none'
                                            }}
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-sm truncate group-hover:text-violet-400 transition-colors">
                                            {template.name}
                                        </h3>
                                        <span className="text-xs text-muted-foreground">
                                            v{template.version}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2rem]">
                                    {template.description}
                                </p>

                                <div className="flex flex-wrap gap-1">
                                    {template.tags?.slice(0, 3).map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                            {tag}
                                        </Badge>
                                    ))}
                                    {template.tags?.length > 3 && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                            +{template.tags.length - 3}
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Deploy Dialog */}
            {selectedTemplate && (
                <TemplateDeployDialog
                    template={selectedTemplate}
                    open={!!selectedTemplate}
                    onOpenChange={(open: boolean) => { if (!open) setSelectedTemplate(null) }}
                />
            )}
        </div>
    )
}
