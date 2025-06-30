import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/providers/theme-provider"
import AuthProvider from "@/providers/auth-provider"
import { Toaster as SonnerToaster } from "sonner"

export const metadata: Metadata = {
  title: "LangConnect Client",
  description: "LangConnect Client",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen overflow-hidden">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
          </AuthProvider>
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
