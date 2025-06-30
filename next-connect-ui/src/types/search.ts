export interface SearchResult {
  id: string
  page_content: string
  metadata: {
    source?: string
    file_id?: string
    [key: string]: any
  }
  score: number
}
