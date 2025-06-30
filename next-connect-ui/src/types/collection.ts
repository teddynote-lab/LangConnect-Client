export interface Collection {
  uuid: string
  name: string
  metadata?: Record<string, any>
}

export interface CollectionStats {
  documents: number
  chunks: number
}

export interface CollectionWithStats extends Collection {
  stats: CollectionStats
}