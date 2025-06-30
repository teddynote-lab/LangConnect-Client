import type React from "react"
import { requireGuest } from "@/lib/auth-utils"
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 이 레이아웃 내의 모든 페이지는 비인증 상태여야 합니다
  await requireGuest()

  return (
    <div className="flex flex-col min-h-screen">
      <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center flex-grow">
        {children}
      </div>
    </div>
  )
}

