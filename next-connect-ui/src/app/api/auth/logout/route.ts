import { NextResponse } from "next/server"
import { fetchAPI, serverFetchAPI } from "@/lib/api"

export async function POST(request: Request) {
  try {
    // 백엔드 API 호출
    const response = await serverFetchAPI("/auth/signout", {
      method: "POST",
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "회원가입 중 오류가 발생했습니다." }, { status: 500 })
  }
}

