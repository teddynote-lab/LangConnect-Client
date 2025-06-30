'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Collection } from '@/types/collection'
import { SearchResult } from '@/types/search'

export default function SearchPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(5)
  const [searchType, setSearchType] = useState('semantic')
  const [filterJson, setFilterJson] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSources, setLoadingSources] = useState(false)
  const [sources, setSources] = useState<string[]>([])
  const [showSources, setShowSources] = useState(false)
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set())

  const fetchCollections = useCallback(async () => {
    try {
      const response = await fetch('/api/collections')
      const res = await response.json()
      if (!res.success) {
        toast.error("컬렉션 오류", {
          description: "컬렉션 조회 실패"
        })
        return
      }
      
      const collectionsData: Collection[] = res.data
      setCollections(collectionsData)
      
      if (collectionsData.length > 0) {
        setSelectedCollection(collectionsData[0].uuid)
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error)
      toast.error("컬렉션 조회 실패")
    }
  }, [])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  const loadSources = async () => {
    if (!selectedCollection) return
    
    setLoadingSources(true)
    try {
      const response = await fetch(`/api/collections/${selectedCollection}/documents?limit=100`)
      const res = await response.json()
      
      if (res.success && res.data) {
        const uniqueSources = new Set<string>()
        res.data.forEach((doc: any) => {
          const source = doc.metadata?.source
          if (source) {
            uniqueSources.add(source)
          }
        })
        setSources(Array.from(uniqueSources).sort())
      } else {
        toast.error("소스 로드 실패")
      }
    } catch (error) {
      console.error('Failed to load sources:', error)
      toast.error("소스 로드 실패")
    } finally {
      setLoadingSources(false)
    }
  }

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("검색어를 입력해주세요")
      return
    }
    
    if (!selectedCollection) {
      toast.error("컬렉션을 선택해주세요")
      return
    }

    setLoading(true)
    try {
      const searchData: any = {
        query,
        limit,
        search_type: searchType
      }

      if (filterJson.trim()) {
        try {
          searchData.filter = JSON.parse(filterJson)
        } catch (error) {
          toast.error("필터 JSON 형식이 잘못되었습니다")
          setLoading(false)
          return
        }
      }

      const response = await fetch(`/api/collections/${selectedCollection}/documents/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchData),
      })

      const res = await response.json()
      
      if (res.success) {
        setResults(res.data || [])
        if (res.data && res.data.length > 0) {
          toast.success(`${res.data.length}개의 결과를 찾았습니다`)
        } else {
          toast.info("검색 결과가 없습니다")
        }
      } else {
        toast.error("검색 실패", {
          description: res.message
        })
      }
    } catch (error) {
      console.error('Search failed:', error)
      toast.error("검색 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  const toggleResultExpansion = (index: number) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const convertNewlinesToBr = (text: string) => {
    return text.replace(/\n/g, '<br>')
  }


  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent flex items-center gap-3">
              <Search className="h-8 w-8 text-blue-500" />
              벡터 검색
            </h1>
            <p className="text-gray-600 mt-1">문서 컬렉션에서 의미론적 검색을 수행하세요</p>
          </div>
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-500" />
              검색 설정
            </CardTitle>
            <CardDescription>
              검색할 컬렉션과 옵션을 설정하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="collection">컬렉션 선택</Label>
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger>
                  <SelectValue placeholder="컬렉션을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((collection) => (
                    <SelectItem key={collection.uuid} value={collection.uuid}>
                      {collection.name} ({collection.uuid.slice(0, 8)}...)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCollection && (
              <Collapsible open={showSources} onOpenChange={setShowSources}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    이 컬렉션의 사용 가능한 소스 보기
                    {showSources ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={loadSources} 
                      disabled={loadingSources}
                      size="sm"
                      variant="secondary"
                    >
                      {loadingSources ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          로딩 중...
                        </>
                      ) : (
                        '소스 로드'
                      )}
                    </Button>
                  </div>
                  {sources.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium text-sm">사용 가능한 소스:</p>
                      <div className="grid grid-cols-1 gap-2">
                        {sources.map((source, index) => (
                          <code key={index} className="text-xs bg-gray-100 p-2 rounded block">
                            {`{"source": "${source}"}`}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="space-y-2">
              <Label htmlFor="query">검색어</Label>
              <Input
                id="query"
                placeholder="검색어를 입력하세요..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="limit">결과 개수</Label>
                <Select value={limit.toString()} onValueChange={(value) => setLimit(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 5, 10, 20, 30, 50].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}개
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchType">검색 타입</Label>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semantic">의미론적 검색</SelectItem>
                    <SelectItem value="keyword">키워드 검색</SelectItem>
                    <SelectItem value="hybrid">하이브리드 검색</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter">메타데이터 필터</Label>
                <Textarea
                  id="filter"
                  placeholder={`{"source": "sample.pdf"}

# 다른 예시
{"file_id": "abc123"}
{"source": "document.pdf", "type": "report"}`}
                  value={filterJson}
                  onChange={(e) => setFilterJson(e.target.value)}
                  rows={2}
                  className="text-sm font-mono"
                />
              </div>
            </div>

            <Button 
              onClick={handleSearch} 
              disabled={loading || !query.trim()}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  검색 중...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  검색
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                검색 결과
              </CardTitle>
              <CardDescription>
                {results.length}개의 결과를 찾았습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.map((result, index) => (
                <Card key={result.id} className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          결과 {index + 1}
                        </Badge>
                        <Badge variant="outline">
                          점수: {result.score.toFixed(4)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleResultExpansion(index)}
                      >
                        {expandedResults.has(index) ? (
                          <>
                            접기 <ChevronUp className="w-4 h-4 ml-1" />
                          </>
                        ) : (
                          <>
                            펼치기 <ChevronDown className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm text-gray-600 mb-2">내용:</h4>
                        <div 
                          className={`text-gray-900 max-w-none break-words overflow-wrap-anywhere word-break overflow-hidden prose prose-sm ${!expandedResults.has(index) ? 'line-clamp-3' : ''}`} 
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto' }}
                          dangerouslySetInnerHTML={{ 
                            __html: expandedResults.has(index) 
                              ? convertNewlinesToBr(result.page_content) 
                              : result.page_content 
                          }}
                        />
                      </div>
                      
                      {expandedResults.has(index) && (
                        <>
                          {result.metadata && Object.keys(result.metadata).length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-600 mb-2">메타데이터:</h4>
                              <pre className="text-xs bg-gray-50 p-3 rounded whitespace-pre-wrap break-words overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>
                                {JSON.stringify(result.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          <div>
                            <h4 className="font-medium text-sm text-gray-600 mb-1">문서 ID:</h4>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {result.id}
                            </code>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}