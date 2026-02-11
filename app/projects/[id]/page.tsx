
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { DeployDialog } from '@/components/deploy-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { ArrowLeft, Box, ExternalLink, GitBranch, Github, Layers, FileCode } from 'lucide-react'
import { ComposeEditor } from '@/components/compose-editor'
import { ComposeEnvEditor } from '@/components/compose-env-editor'
import { ComposeStackControls } from '@/components/compose-stack-controls'
import { ExposeServiceForm } from '@/components/expose-form'
import { ComposeLogs } from '@/components/compose-logs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function ProjectPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await getSession()
    if (!session) redirect('/login')

    const { id } = await params
    const { tab } = await searchParams

    const project = await db.project.findUnique({
        where: { id },
        include: {
            services: {
                orderBy: { createdAt: 'desc' },
                include: {
                    exposedUrls: true,
                    envVariables: true
                }
            }
        }
    })

    if (!project) notFound()

    if (session.role !== 'ADMIN' && project.ownerId !== session.userId) {
        redirect('/dashboard')
    }

    const isCompose = project.type === 'COMPOSE'

    return (
        <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
            <div className="mb-8">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground flex items-center mb-4 text-sm transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                            {isCompose && <Badge variant="secondary">Compose Project</Badge>}
                        </div>
                        <p className="text-muted-foreground mt-1">{project.description || "No description provided."}</p>
                    </div>
                    {!isCompose && <DeployDialog projectId={project.id} />}
                    {isCompose && <ComposeStackControls projectId={project.id} hasServices={project.services.length > 0} />}
                </div>
            </div>

            {isCompose ? (
                <Tabs defaultValue={(tab as string) || "services"} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="services">Services</TabsTrigger>
                        <TabsTrigger value="logs">Logs</TabsTrigger>
                        <TabsTrigger value="config">Configuration</TabsTrigger>
                        <TabsTrigger value="env">Environment</TabsTrigger>
                        <TabsTrigger value="network">Network</TabsTrigger>
                    </TabsList>

                    <TabsContent value="services">
                        <ServicesList project={project} />
                    </TabsContent>

                    <TabsContent value="logs">
                        <ComposeLogs projectId={project.id} />
                    </TabsContent>

                    <TabsContent value="config">
                        <div className="grid gap-6">
                            <ComposeEditor projectId={project.id} initialContent={project.composeContent || ''} />
                        </div>
                    </TabsContent>

                    <TabsContent value="env">
                        <div className="grid gap-6 h-[600px]">
                            {/* @ts-ignore */}
                            <ComposeEnvEditor projectId={project.id} initialEnv={project.envContent || ''} composeContent={project.composeContent || ''} />
                        </div>
                    </TabsContent>

                    <TabsContent value="network">
                        <div className="space-y-6">
                            {project.services.length > 0 ? (
                                project.services.map((service: any) => (
                                    <Card key={service.id}>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Box className="w-4 h-4" />
                                                {service.name}
                                            </CardTitle>
                                            <CardDescription>Configure external access for this service</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ExposeServiceForm service={service} />
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <Card className="border-dashed border-2 bg-transparent">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <p>Deploy the stack first to configure network access.</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            ) : (
                <ServicesList project={project} showDeployPlaceholder />
            )}
        </div>
    )
}

function ServicesList({ project, showDeployPlaceholder = false }: { project: any, showDeployPlaceholder?: boolean }) {
    if (project.services.length === 0) {
        return (
            <Card className="border-dashed border-2 bg-transparent">
                <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                    <div className="p-4 bg-muted rounded-full">
                        <Layers className="h-8 w-8" />
                    </div>
                    <p>No services deployed yet.</p>
                    {showDeployPlaceholder && (
                        <DeployDialog projectId={project.id} trigger={<Button variant="outline">Deploy Service</Button>} />
                    )}
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            {project.services.map((service: any) => (
                <Link key={service.id} href={`/projects/${project.id}/services/${service.id}`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${getStatusBgColor(service.status)}/10`}>
                                    <Box className={`w-6 h-6 ${getStatusColor(service.status)}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-lg">{service.name}</h3>
                                        <Badge variant="outline" className={`${getStatusColor(service.status)} border-current`}>
                                            {service.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                        <span className="flex items-center gap-1">
                                            {service.sourceType === 'GITHUB' ? <Github className="w-3 h-3" /> : service.sourceType === 'COMPOSE_RAW' ? <FileCode className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                                            {service.gitRepoUrl ? service.gitRepoUrl.split('/').slice(-2).join('/') : service.imageName || 'Docker Compose'}
                                        </span>
                                        {service.gitBranch && (
                                            <span className="flex items-center gap-1">
                                                <GitBranch className="w-3 h-3" />
                                                {service.gitBranch}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                                {service.exposedUrls.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {service.exposedUrls.map((url: any) => (
                                            <Badge key={url.id} variant="secondary" className="font-normal">
                                                {url.fullUrl} <ExternalLink className="w-3 h-3 ml-1" />
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                    Updated {new Date(service.updatedAt).toLocaleDateString()}
                                </div>
                            </div>

                        </div>
                    </Card>
                </Link>
            ))}
        </div>
    )
}

function getStatusColor(status: string) {
    switch (status) {
        case 'RUNNING': return 'text-emerald-500'
        case 'STOPPED': return 'text-zinc-500'
        case 'ERROR': return 'text-red-500'
        case 'STARTING': return 'text-yellow-500'
        case 'BUILDING': return 'text-blue-500'
        case 'DEPLOYING': return 'text-blue-500'
        default: return 'text-zinc-500'
    }
}

function getStatusBgColor(status: string) {
    switch (status) {
        case 'RUNNING': return 'bg-emerald-500'
        case 'STOPPED': return 'bg-zinc-500'
        case 'ERROR': return 'bg-red-500'
        case 'STARTING': return 'bg-yellow-500'
        case 'BUILDING': return 'bg-blue-500'
        case 'DEPLOYING': return 'bg-blue-500'
        default: return 'bg-zinc-500'
    }
}
