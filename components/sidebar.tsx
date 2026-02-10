
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Settings, LogOut, Box, Globe, Activity, Container, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Templates', href: '/templates', icon: LayoutGrid },
    { name: 'Status', href: '/status', icon: Activity },
    { name: 'Containers', href: '/containers', icon: Container },
    { name: 'Domains', href: '/domains', icon: Globe },
    { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <div className={cn(
            "sticky top-0 flex h-screen flex-col justify-between border-r border-zinc-800 bg-zinc-950 text-white transition-all duration-300",
            isCollapsed ? "w-16" : "w-64"
        )}>
            <div className={cn("p-6", isCollapsed && "p-3")}>
                <div className={cn(
                    "flex items-center mb-8 transition-all",
                    isCollapsed ? "justify-center" : "gap-2"
                )}>
                    <Box className="h-8 w-8 text-white flex-shrink-0" />
                    {!isCollapsed && <span className="text-xl font-bold tracking-tight whitespace-nowrap">Homelab PaaS</span>}
                </div>
                <nav className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard')
                        return (
                            <Link key={item.href} href={item.href} title={isCollapsed ? item.name : undefined}>
                                <div className={cn(
                                    "flex items-center rounded-lg text-sm font-medium transition-colors",
                                    isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2",
                                    isActive
                                        ? "bg-zinc-800 text-white"
                                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                                )}>
                                    <Icon className="h-4 w-4 flex-shrink-0" />
                                    {!isCollapsed && <span>{item.name}</span>}
                                </div>
                            </Link>
                        )
                    })}
                </nav>
            </div>
            <div className={cn("border-t border-zinc-800")}>
                <div className={cn("p-6", isCollapsed && "p-3")}>
                    <form action="/api/auth/logout" method="POST">
                        {isCollapsed ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-full text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800/50 pl-3">
                                <LogOut className="h-4 w-4 mr-3" />
                                Logout
                            </Button>
                        )}
                    </form>
                </div>
                <div className={cn("p-3 border-t border-zinc-800")}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "w-full text-zinc-400 hover:text-white hover:bg-zinc-800/50",
                            isCollapsed && "p-0"
                        )}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <ChevronLeft className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
