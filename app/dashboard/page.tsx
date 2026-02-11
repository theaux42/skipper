
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { SystemGraphs } from '@/components/dashboard/system-graphs'
import { ProjectGrid } from '@/components/dashboard/project-grid'
import { getCached } from '@/lib/server-cache'

export default async function DashboardPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    // Cache project list for 10 seconds to avoid Prisma queries on rapid navigation
    const projects = await getCached(`projects-${session.userId}-${session.role}`, async () => {
        return db.project.findMany({
            where: session.role === 'ADMIN' ? {} : { ownerId: session.userId },
            include: {
                _count: {
                    select: { services: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        })
    }, 10_000)

    return (
        <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
            <SystemGraphs />

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground mt-1">Manage your applications and services.</p>
                </div>
                <CreateProjectDialog />
            </div>

            <ProjectGrid projects={JSON.parse(JSON.stringify(projects))} />
        </div>
    )
}
