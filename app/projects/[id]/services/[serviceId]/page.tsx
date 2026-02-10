
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ServiceHeader } from '@/components/service-header'
import { ServiceStats } from '@/components/service-stats'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { ServiceLogs } from '@/components/service-logs'
import { DeploymentLogs } from '@/components/deployment-logs'
import { ServiceEnv } from '@/components/service-env'
import { ExposeServiceForm } from '@/components/expose-form'
import { ServiceTerminal } from '@/components/service-terminal'

export default async function ServicePage({ params }: { params: Promise<{ id: string; serviceId: string }> }) {
    const session = await getSession()
    if (!session) redirect('/login')

    const { id: projectId, serviceId } = await params

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
            <div className="mb-6">
                <Link href={`/projects/${projectId}`} className="text-muted-foreground hover:text-foreground flex items-center mb-4 text-sm transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Project
                </Link>
            </div>

            <ServiceHeader
                serviceId={service.id}
                status={service.status}
                projectId={projectId}
                name={service.name}
            />

            <div className="mb-6">
                <ServiceStats serviceId={service.id} />
            </div>

            <Card className="overflow-hidden">
                <Tabs defaultValue="logs" className="w-full">
                    <div className="border-b px-4 py-2 bg-muted/30">
                        <TabsList className="bg-muted/50 text-muted-foreground">
                            <TabsTrigger value="logs">Logs</TabsTrigger>
                            <TabsTrigger value="deploy-logs">Deploy</TabsTrigger>
                            <TabsTrigger value="terminal">Terminal</TabsTrigger>
                            <TabsTrigger value="env">Environment</TabsTrigger>
                            <TabsTrigger value="network">Network</TabsTrigger>
                        </TabsList>
                    </div>

                    <CardContent className="p-0">
                        <TabsContent value="logs" className="m-0 p-4 min-h-[400px] bg-black font-mono text-sm">
                            <ServiceLogs serviceId={service.id} />
                        </TabsContent>
                        <TabsContent value="deploy-logs" className="m-0 p-4 min-h-[400px] bg-black">
                            <DeploymentLogs serviceId={service.id} />
                        </TabsContent>
                        <TabsContent value="terminal" className="m-0 min-h-[400px]">
                            <ServiceTerminal serviceId={service.id} containerId={service.containerId} />
                        </TabsContent>
                        <TabsContent value="env" className="m-0 p-4 min-h-[400px]">
                            <ServiceEnv serviceId={service.id} envs={service.envVariables} />
                        </TabsContent>
                        <TabsContent value="network" className="m-0 p-4 min-h-[400px]">
                            <ExposeServiceForm service={service} />
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    )
}
