
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ContainersList } from '@/components/containers/containers-list'

export default async function ContainersPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const services = await db.service.findMany({
        include: {
            project: true,
        },
        orderBy: { updatedAt: 'desc' }
    })

    return (
        <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Containers</h1>
            <p className="text-muted-foreground mb-8">Manage all containers across your projects.</p>

            <ContainersList services={JSON.parse(JSON.stringify(services))} />
        </div>
    )
}
