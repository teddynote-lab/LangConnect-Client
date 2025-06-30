import { NextResponse } from "next/server"
import { serverFetchAPI } from "@/lib/api"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  try {
    const body = await request.json()
    
    const response = await serverFetchAPI(`/collections/${id}/documents/search`, {
      method: "POST",
      body: JSON.stringify(body),
    })

    return NextResponse.json({ success: true, data: response }, { status: 200 })
  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to perform search'
    }, { status: 500 })
  }
}