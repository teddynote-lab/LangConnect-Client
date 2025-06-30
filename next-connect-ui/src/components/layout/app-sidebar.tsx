"use client"

import { usePathname } from "next/navigation"
import {
  FileText,
  Search,
  Home,
  Database,
  Code,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import Link from "next/link"

export function AppSidebar() {
  const pathname = usePathname()

  const mainItems = [
    {
      name: "메인",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      name: "컬렉션",
      href: "/collections",
      icon: Database,
      isActive: pathname.startsWith("/collections"),
    },
    {
      name: "문서",
      href: "/documents",
      icon: FileText,
      isActive: pathname.startsWith("/documents"),
    },
    {
      name: "검색",
      href: "/search",
      icon: Search,
      isActive: pathname.startsWith("/search"),
    },
    {
      name: "API 테스터",
      href: "/api-tester",
      icon: Code,
      isActive: pathname.startsWith("/api-tester"),
    },
  ]

  return (
    <>
      <Sidebar variant="inset" collapsible="icon" >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/">
                  <div className="text-md">🔗</div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium text-lg">LangConnect</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain title="메인" items={mainItems} />
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>
    </>
  )
}