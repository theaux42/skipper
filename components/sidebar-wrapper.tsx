
'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

export function SidebarWrapper() {
    const pathname = usePathname()
    // Hide sidebar on auth pages
    if (pathname === '/login' || pathname === '/setup') {
        return null
    }
    return <Sidebar />
}
