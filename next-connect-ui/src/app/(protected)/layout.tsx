import type React from "react"

import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { requireAuth } from "@/lib/auth-utils"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  
  await requireAuth()

  return (
    <SidebarProvider
    style={
      {
        "--sidebar-width": "14rem",
        "--sidebar-width-icon": "2.7rem",
      } as React.CSSProperties
    }
    >
      <AppSidebar />
      <SidebarInset className="!shadow-none border border-gray-200">
        <AppHeader />
        <main className="flex flex-1 w-full">
          <ScrollArea className="h-[calc(100vh-4.5rem)] w-full flex-1">
            {children}
          </ScrollArea>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
