"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { TriangleAlert } from "lucide-react"

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  let errorMessage = "인증 중 오류가 발생했습니다."
  let errorDescription = "다시 시도해주세요."

  // 오류 메시지 매핑
  switch (error) {
    case "Signin":
      errorMessage = "로그인 실패"
      errorDescription = "이메일 또는 비밀번호가 올바르지 않습니다."
      break
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthCreateAccount":
    case "EmailCreateAccount":
    case "Callback":
      errorMessage = "소셜 로그인 오류"
      errorDescription = "소셜 계정으로 로그인하는 중 문제가 발생했습니다."
      break
    case "OAuthAccountNotLinked":
      errorMessage = "계정 연결 오류"
      errorDescription = "이 이메일은 이미 다른 소셜 계정으로 가입되어 있습니다."
      break
    case "EmailSignin":
      errorMessage = "이메일 로그인 오류"
      errorDescription = "이메일 로그인 링크를 보내는 중 문제가 발생했습니다."
      break
    case "CredentialsSignin":
      errorMessage = "로그인 실패"
      errorDescription = "이메일 또는 비밀번호가 올바르지 않습니다."
      break
    case "SessionRequired":
      errorMessage = "로그인 필요"
      errorDescription = "이 페이지에 접근하려면 로그인이 필요합니다."
      break
    default:
      errorMessage = "인증 오류"
      errorDescription = "인증 중 문제가 발생했습니다."
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-2xl">{errorMessage}</h1>
      <p className="text-sm text-muted-foreground">{errorDescription}</p>
      <div className="flex flex-col items-center justify-center space-y-4 py-6">
        <div className="rounded-full bg-destructive/10 p-6">
          <TriangleAlert className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">다시 시도하거나 다른 방법으로 로그인해보세요.</p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/">홈으로</Link>
          </Button>
          <Button asChild>
            <Link href="/signin">로그인 페이지로</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

