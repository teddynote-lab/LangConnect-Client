export interface Document {
  id: string
  content: string
  metadata: {
    source?: string
    file_id?: string
    timestamp?: string
    [key: string]: any
  }
}

export interface DocumentGroup {
  source: string
  file_id: string
  chunks: Document[]
  timestamp: string
  total_chars: number
}