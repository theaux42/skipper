
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DomainsTable } from '@/components/domains/domains-table'

export default async function DomainsPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const domains = await db.exposedUrl.findMany({
        include: {
            service: {
                include: {
                    project: true
                }
            }
        },
        orderBy: { fullUrl: 'asc' }
    })

    // Fetch all services for the "bind to service" dropdown
    const services = await db.service.findMany({
        include: { project: { select: { name: true } } },
        orderBy: { name: 'asc' }
    })

    return (
        <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Domains</h1>
            <p className="text-muted-foreground mb-8">Manage domain bindings and public URLs.</p>

            <DomainsTable
                domains={JSON.parse(JSON.stringify(domains))}
                services={JSON.parse(JSON.stringify(services))}
            />
        </div>
    )
}
