"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Home } from "lucide-react"

// Navigation data structure matching sidebar
interface NavigationItem {
  name: string
  href: string
  isHome?: boolean
}

const navigationData: {
  main: NavigationItem[]
} = {
  main: [
    { name: "Main", href: "/", isHome: true },
    { name: "Collections", href: "/collections" },
    { name: "Documents", href: "/documents" },
    { name: "Search", href: "/search" },
    { name: "API Tester", href: "/api-tester" },
  ],
}

export function AppHeader() {
  const pathname = usePathname()

  // Generate breadcrumb items based on current path
  const generateBreadcrumb = () => {
    if (pathname === "/") {
      return [{ name: "Main", href: "/", isHome: true }]
    }

    const allItems = [
      ...navigationData.main,
    ]

    const breadcrumbItems = []

    // Find main item
    const mainItem = allItems.find(item => 
      pathname === item.href || pathname.startsWith(item.href + "/")
    )

    if (mainItem) {
      breadcrumbItems.push(mainItem)
    }

    return breadcrumbItems
  }

  const breadcrumbItems = generateBreadcrumb()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 justify-between">
      <div className="flex items-center gap-2 px-4 flex-1">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbItems.map((item, index) => (
              <div key={item.href} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {index === breadcrumbItems.length - 1 ? (
                    <BreadcrumbPage className="flex items-center gap-2">
                      {item.isHome && <Home className="h-4 w-4" />}
                      {item.name}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href} className="flex items-center gap-2">
                      {item.isHome && <Home className="h-4 w-4" />}
                      {item.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
