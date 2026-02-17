
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ServiceHeader } from '@/components/service-header'
import { ServiceStats } from '@/components/service-stats'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { ServiceLogs } from '@/components/service-logs'
import { ServiceEnv } from '@/components/service-env'
import { ExposeServiceForm } from '@/components/expose-form'
import { ServiceTerminal } from '@/components/service-terminal'

export default async function ServicePage({
    params,
    searchParams
}: {
    params: Promise<{ id: string; serviceId: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await getSession()
    if (!session) redirect('/login')

    const { id: projectId, serviceId } = await params
    const { tab } = await searchParams

    const service = await db.service.findUnique({
        where: { id: serviceId },
        include: {
            project: true,
            exposedUrls: true,
            envVariables: true
        }
    })

    if (!service || service.projectId !== projectId) notFound()

    if (session.role !== 'ADMIN' && service.project.ownerId !== session.userId) {
        redirect('/dashboard')
    }

    return (
        <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
            <div className="mb-8">
                <Link href={`/projects/${projectId}`} className="text-muted-foreground hover:text-foreground flex items-center mb-4 text-sm transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Project
                </Link>

                <ServiceHeader
                    serviceId={service.id}
                    status={service.status}
                    projectId={projectId}
                    name={service.name}
                />
            </div>

            <div className="mb-6">
                <ServiceStats serviceId={service.id} />
            </div>

            <Tabs defaultValue={(tab as string) || "logs"} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                    <TabsTrigger value="terminal">Terminal</TabsTrigger>
                    <TabsTrigger value="env">Environment</TabsTrigger>
                    <TabsTrigger value="network">Network</TabsTrigger>
                </TabsList>

                <TabsContent value="logs">
                    <ServiceLogs serviceId={service.id} />
                </TabsContent>

                <TabsContent value="terminal">
                    <ServiceTerminal serviceId={service.id} containerId={service.containerId} />
                </TabsContent>

                <TabsContent value="env">
                    <ServiceEnv serviceId={service.id} envs={service.envVariables} />
                </TabsContent>

                <TabsContent value="network">
                    <ExposeServiceForm service={service} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
