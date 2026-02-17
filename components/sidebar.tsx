'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Settings, LogOut, Box, Globe, Activity, Container, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { ThemeSwitch } from '@/components/theme-switch'

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Templates', href: '/templates', icon: LayoutGrid },
    { name: 'Status', href: '/status', icon: Activity },
    { name: 'Containers', href: '/containers', icon: Container },
    { name: 'Domains', href: '/domains', icon: Globe },
    { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
    const router = useRouter()
    const pathname = usePathname()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const handleLogout = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/login"); // Redirect to login page
                }
            }
        });
    }

    return (
        <div className={cn(
            "sticky top-0 flex h-screen flex-col justify-between border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300",
            isCollapsed ? "w-16" : "w-64"
        )}>
            <div className={cn("p-6", isCollapsed && "p-3")}>
                {/* Brand */}
                <div className={cn(
                    "flex items-center mb-10 transition-all",
                    isCollapsed ? "justify-center" : "gap-3"
                )}>
                    <Box className="h-7 w-7 flex-shrink-0" />
                    {!isCollapsed && (
                        <span className="heading-display text-xl whitespace-nowrap">
                            Skipper
                        </span>
                    )}
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard')
                        return (
                            <Link key={item.href} href={item.href} title={isCollapsed ? item.name : undefined}>
                                <div className={cn(
                                    "flex items-center rounded-sm text-sm font-sans font-medium tracking-wide transition-colors duration-200",
                                    isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-foreground border border-sidebar-border"
                                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground border border-transparent"
                                )}>
                                    <Icon className="h-4 w-4 flex-shrink-0" />
                                    {!isCollapsed && <span>{item.name}</span>}
                                </div>
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Bottom section */}
            <div className="border-t border-border">
                {/* Theme switch */}
                <div className={cn("p-4 flex", isCollapsed ? "justify-center" : "justify-between items-center")}>
                    {!isCollapsed && (
                        <span className="label-ui text-muted-foreground">Theme</span>
                    )}
                    <ThemeSwitch />
                </div>

                <div className="border-t border-border">
                    <div className={cn("p-4", isCollapsed && "p-3")}>
                        {isCollapsed ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-full text-muted-foreground hover:text-foreground"
                                onClick={handleLogout}
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-muted-foreground hover:text-foreground pl-3 normal-case tracking-normal"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4 mr-3" />
                                Logout
                            </Button>
                        )}
                    </div>
                </div>

                <div className={cn("p-3 border-t border-border")}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "w-full text-muted-foreground hover:text-foreground",
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
