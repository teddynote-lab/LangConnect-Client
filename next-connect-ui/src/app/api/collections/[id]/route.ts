import { NextResponse } from "next/server"
import { serverFetchAPI } from "@/lib/api"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // 백엔드 API 호출
    const response = await serverFetchAPI(`/collections/${id}`, {
      method: "DELETE",
    })

    return NextResponse.json({ success: true, data: response }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const response = await serverFetchAPI(`/collections/${id}`, {
    method: "GET",
  })
  return NextResponse.json({ success: true, data: response }, { status: 200 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const response = await serverFetchAPI(`/collections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    return NextResponse.json({ success: true, data: response }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}