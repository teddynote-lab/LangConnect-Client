"use client"

import { usePathname } from "next/navigation"
import {
  FileText,
  Search,
  Home,
  Database,
  Code,
  Globe,
  Server,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import Link from "next/link"
import { useTranslation } from "@/hooks/use-translation"
import { useLanguage } from "@/providers/language-provider"

export function AppSidebar() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()

  const mainItems = [
    {
      name: t("sidebar.main"),
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      name: t("sidebar.collections"),
      href: "/collections",
      icon: Database,
      isActive: pathname.startsWith("/collections"),
    },
    {
      name: t("sidebar.documents"),
      href: "/documents",
      icon: FileText,
      isActive: pathname.startsWith("/documents"),
    },
    {
      name: t("sidebar.search"),
      href: "/search",
      icon: Search,
      isActive: pathname.startsWith("/search"),
    },
    {
      name: t("sidebar.apiTester"),
      href: "/api-tester",
      icon: Code,
      isActive: pathname.startsWith("/api-tester"),
    },
    {
      name: t("sidebar.mcp"),
      href: "/mcp",
      icon: Server,
      isActive: pathname.startsWith("/mcp"),
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
          <NavMain title={t("sidebar.mainTitle")} items={mainItems} />
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="px-3 py-2">
                <Select value={language} onValueChange={(value: 'en' | 'ko') => setLanguage(value)}>
                  <SelectTrigger className="w-full h-9">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t("language.english")}</SelectItem>
                    <SelectItem value="ko">{t("language.korean")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
          <NavUser />
        </SidebarFooter>
      </Sidebar>
    </>
  )
}