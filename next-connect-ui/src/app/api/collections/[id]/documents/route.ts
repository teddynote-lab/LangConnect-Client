import { NextResponse } from "next/server"
import { serverFetchAPI } from "@/lib/api"
import { uploadFormData } from "@/lib/api"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get('limit') || '10'
  const offset = searchParams.get('offset') || '0'
    
  try {
    // 백엔드 API 호출 with query parameters
    const response = await serverFetchAPI(`/collections/${id}/documents?limit=${limit}&offset=${offset}`, {
      method: "GET",
    })

    return NextResponse.json({ success: true, data: response }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  try {
    // FormData를 받아서 axios로 백엔드에 전달
    const formData = await request.formData()
    
    // axios FormData 업로드 함수 사용
    const response = await uploadFormData(`/collections/${id}/documents`, formData)

    return NextResponse.json({ success: true, data: response }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to upload documents'
    }, { status: 500 })
  }
}
