'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Trash2, FileText, Loader2, Database, FolderOpen, Archive, BookOpen, Upload, File, Filter, ChevronLeft, ChevronRight, X, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UploadDocumentModal } from '@/components/modals/upload-document-modal'
import { Collection } from '@/types/collection'
import { Document, DocumentGroup } from '@/types/document'


export default function DocumentsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [documents, setDocuments] = useState<Document[]>([])
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('documents')
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false)
  
  // Selection states
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [selectedChunks, setSelectedChunks] = useState<string[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Popover states
  const [openPopovers, setOpenPopovers] = useState<Set<string>>(new Set())
  const [openSourcePopovers, setOpenSourcePopovers] = useState<Set<string>>(new Set())

  // Filtering states
  const [availableSources, setAvailableSources] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])

  const fetchCollections = useCallback(async () => {
    try {
      const response = await fetch('/api/collections')
      const res = await response.json()
      if (!res.success) {
        toast.error("컬렉션 오류", {
          description: "컬렉션 조회 실패"
        })
        setCollections([])
        return
      }
      
      const collectionsData: Collection[] = res.data
      setCollections(collectionsData)
      
      if (collectionsData.length > 0 && !selectedCollection) {
        setSelectedCollection(collectionsData[0].uuid)
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error)
      toast.error("네트워크 오류", {
        description: "컬렉션을 불러올 수 없습니다"
      })
    }
  }, [selectedCollection])

  const fetchDocuments = useCallback(async () => {
    if (!selectedCollection) return

    try {
      setLoading(true)
      
      // Fetch all documents using pagination
      let allDocuments: Document[] = []
      let offset = 0
      const limit = 100

      while (true) {
        const response = await fetch(
          `/api/collections/${selectedCollection}/documents?limit=${limit}&offset=${offset}`
        )
        const res = await response.json()
        
        if (!res.success) {
          toast.error("문서 오류", {
            description: "문서 조회 실패"
          })
          break
        }

        const docs = res.data
        if (!docs || docs.length === 0) break

        allDocuments = allDocuments.concat(docs)

        if (docs.length < limit) break
        offset += limit
      }

      setDocuments(allDocuments)
      setTotalItems(allDocuments.length)

      // Group documents by source/file_id for the documents tab
      const sourceGroups: { [key: string]: DocumentGroup } = {}
      const sources = new Set<string>()

      allDocuments.forEach(doc => {
        const metadata = doc.metadata || {}
        const file_id = metadata.file_id || 'N/A'
        const source = metadata.source || 'N/A'
        sources.add(source)
        
        if (!sourceGroups[file_id]) {
          sourceGroups[file_id] = {
            source,
            file_id,
            chunks: [],
            timestamp: metadata.timestamp || 'N/A',
            total_chars: 0
          }
        }
        
        sourceGroups[file_id].chunks.push(doc)
        sourceGroups[file_id].total_chars += doc.content.length
      })

      const groups = Object.values(sourceGroups)
      setDocumentGroups(groups)
      setAvailableSources(Array.from(sources))
      setSelectedSources(Array.from(sources))

    } catch (error) {
      console.error('Failed to fetch documents:', error)
      toast.error("네트워크 오류", {
        description: "문서를 불러올 수 없습니다"
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedCollection])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  useEffect(() => {
    if (selectedCollection) {
      fetchDocuments()
    }
  }, [selectedCollection, fetchDocuments])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDocuments()
  }

  const handleDeleteSelected = useCallback(async () => {
    const toDelete = activeTab === 'documents' ? selectedDocuments : selectedChunks
    if (toDelete.length === 0) return

    setDeleting(true)
    let deletedCount = 0
    let failedCount = 0

    for (const id of toDelete) {
      try {
        const deleteBy = activeTab === 'documents' ? 'file_id' : 'document_id'
        await fetch(`/api/collections/${selectedCollection}/documents/${id}?delete_by=${deleteBy}`, {
          method: 'DELETE',
        })
        deletedCount++
      } catch (error) {
        failedCount++
        console.error(`Failed to delete ${activeTab === 'documents' ? 'document' : 'chunk'} ${id}:`, error)
      }
    }

    setDeleting(false)
    setShowDeleteConfirm(false)
    setSelectedDocuments([])
    setSelectedChunks([])

    if (deletedCount > 0) {
      toast.success(`${deletedCount}개의 ${activeTab === 'documents' ? '문서' : '청크'}가 성공적으로 삭제되었습니다.`)
    }
    if (failedCount > 0) {
      toast.error(`${failedCount}개의 ${activeTab === 'documents' ? '문서' : '청크'} 삭제에 실패했습니다.`)
    }

    fetchDocuments()
  }, [selectedDocuments, selectedChunks, activeTab, selectedCollection, fetchDocuments])

  const toggleDocumentSelection = (file_id: string) => {
    setSelectedDocuments(prev => 
      prev.includes(file_id) 
        ? prev.filter(id => id !== file_id)
        : [...prev, file_id]
    )
  }

  const toggleChunkSelection = (chunk_id: string) => {
    setSelectedChunks(prev => 
      prev.includes(chunk_id) 
        ? prev.filter(id => id !== chunk_id)
        : [...prev, chunk_id]
    )
  }

  const togglePopover = (docId: string, isOpen: boolean) => {
    setOpenPopovers(prev => {
      const newSet = new Set(prev)
      if (isOpen) {
        newSet.add(docId)
      } else {
        newSet.delete(docId)
      }
      return newSet
    })
  }

  const toggleSourcePopover = (sourceId: string, isOpen: boolean) => {
    setOpenSourcePopovers(prev => {
      const newSet = new Set(prev)
      if (isOpen) {
        newSet.add(sourceId)
      } else {
        newSet.delete(sourceId)
      }
      return newSet
    })
  }

  // Filter documents and chunks based on selected sources
  const filteredDocumentGroups = documentGroups.filter(group => 
    selectedSources.includes(group.source)
  )
  
  const filteredDocuments = documents.filter(doc => 
    selectedSources.includes(doc.metadata?.source || 'N/A')
  )
  
  // Pagination logic
  const totalPages = Math.ceil(
    activeTab === 'documents' 
      ? filteredDocumentGroups.length / itemsPerPage 
      : filteredDocuments.length / itemsPerPage
  )
  
  const paginatedDocumentGroups = filteredDocumentGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  
  // Reset to page 1 when changing tabs or filters
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, selectedSources])

  // Statistics calculation
  const totalDocuments = documentGroups.length
  const totalChunks = documents.length
  const totalCharacters = documents.reduce((sum, doc) => sum + doc.content.length, 0)
  


  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-6" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-6" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </div>
    </div>
  )

  // Empty state component
  const EmptyState = () => (
    <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-green-50 p-6 mb-4">
          <FileText className="h-12 w-12 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">문서가 없습니다</h3>
        <p className="text-gray-500 text-center mb-6 max-w-sm">
          첫 번째 문서를 업로드하여 컬렉션을 구축해보세요.
        </p>
        <Button 
          onClick={() => setShowUploadModal(true)}
          disabled={!selectedCollection}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          <Upload className="w-4 h-4 mr-2" />
          첫 문서 업로드
        </Button>
      </CardContent>
    </Card>
  )

  // Empty documents tab state
  const EmptyDocumentsState = () => (
    <div className="bg-white rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
      <div className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-green-50 p-8 mb-6">
          <File className="h-16 w-16 text-green-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">문서가 없습니다</h3>
        <p className="text-gray-500 text-center mb-8 max-w-md">
          선택한 컬렉션에 문서가 없습니다. 문서를 업로드하여 시작해보세요.
        </p>
        <Button 
          onClick={() => setShowUploadModal(true)}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Upload className="w-5 h-5 mr-2" />
          문서 업로드하기
        </Button>
      </div>
    </div>
  )

  // Empty chunks tab state
  const EmptyChunksState = () => (
    <div className="bg-white rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
      <div className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-purple-50 p-8 mb-6">
          <Archive className="h-16 w-16 text-purple-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">청크가 없습니다</h3>
        <p className="text-gray-500 text-center mb-8 max-w-md">
          선택한 컬렉션에 청크가 없습니다. 문서를 업로드하면 자동으로 청크가 생성됩니다.
        </p>
        <Button 
          onClick={() => setShowUploadModal(true)}
          className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Upload className="w-5 h-5 mr-2" />
          문서 업로드하기
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent flex items-center gap-3">
              <FileText className="h-8 w-8 text-green-500" />
              문서 관리
            </h1>
            <p className="text-gray-600 mt-1">문서를 업로드하고 관리하세요</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedCollection} onValueChange={setSelectedCollection}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="컬렉션 선택" />
              </SelectTrigger>
              <SelectContent>
                {collections.map((collection) => (
                  <SelectItem key={collection.uuid} value={collection.uuid}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button 
              onClick={() => setShowUploadModal(true)}
              disabled={!selectedCollection}
              size="sm"
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Upload className="w-4 h-4 mr-2" />
              문서 업로드
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !refreshing && <LoadingSkeleton />}

        {/* Empty State */}
        {!loading && selectedCollection && totalDocuments === 0 && <EmptyState />}

        {/* Content */}
        {!loading && selectedCollection && totalDocuments > 0 && (
          <>
            {/* Statistics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">문서</span>
                    <span className="font-semibold text-gray-900">{totalDocuments}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-gray-600">청크</span>
                    <span className="font-semibold text-gray-900">{totalChunks}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">문자</span>
                    <span className="font-semibold text-gray-900">{totalCharacters.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents and Chunks Tabs */}
            <Card className="shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-green-500" />
                      문서 및 청크 관리
                    </CardTitle>
                    <CardDescription>
                      {((activeTab === 'documents' ? selectedDocuments : selectedChunks).length > 0) 
                        ? `${(activeTab === 'documents' ? selectedDocuments : selectedChunks).length}개 선택됨` 
                        : activeTab === 'documents' 
                          ? `총 ${filteredDocumentGroups.length}개의 문서`
                          : `${filteredDocuments.length}/${documents.length}개의 청크`}
                    </CardDescription>
                  </div>
                  
                  {((activeTab === 'documents' ? selectedDocuments : selectedChunks).length > 0) && (
                    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex items-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          선택 항목 삭제
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
                          <AlertDialogDescription>
                            정말로 선택한 {activeTab === 'documents' ? '문서' : '청크'}를 삭제하시겠습니까? 이 작업은 복구할 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteSelected}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deleting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                삭제 중...
                              </>
                            ) : (
                              '삭제'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="documents" className="flex items-center gap-2">
                      <File className="w-4 h-4" />
                      문서
                    </TabsTrigger>
                    <TabsTrigger value="chunks" className="flex items-center gap-2">
                      <Archive className="w-4 h-4" />
                      청크
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="documents" className="mt-6">
                    {filteredDocumentGroups.length === 0 ? (
                      <EmptyDocumentsState />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="w-8 px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={paginatedDocumentGroups.length > 0 && paginatedDocumentGroups.every(g => selectedDocuments.includes(g.file_id))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // 현재 페이지의 모든 항목을 선택
                                    const currentPageIds = paginatedDocumentGroups.map(g => g.file_id)
                                    setSelectedDocuments([...new Set([...selectedDocuments, ...currentPageIds])])
                                  } else {
                                    // 현재 페이지의 모든 항목을 선택 해제
                                    const currentPageIds = paginatedDocumentGroups.map(g => g.file_id)
                                    setSelectedDocuments(selectedDocuments.filter(id => !currentPageIds.includes(id)))
                                  }
                                }}
                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                              />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              소스
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              통계
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              File ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              타임스탬프
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginatedDocumentGroups.map((group) => (
                            <tr
                              key={group.file_id}
                              className={`transition-colors hover:bg-gray-50/50 ${
                                selectedDocuments.includes(group.file_id) ? 'bg-green-50/50' : ''
                              }`}
                            >
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedDocuments.includes(group.file_id)}
                                  onChange={() => toggleDocumentSelection(group.file_id)}
                                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                      <FileText className="h-4 w-4 text-white" />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Popover 
                                      open={openSourcePopovers.has(group.file_id)}
                                      onOpenChange={(isOpen) => toggleSourcePopover(group.file_id, isOpen)}
                                    >
                                      <PopoverTrigger asChild>
                                        <button className="text-sm font-medium text-gray-900 hover:text-green-600 transition-colors cursor-pointer flex items-center gap-1">
                                          {group.source}
                                          <Info className="h-3 w-3 text-gray-400" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[600px] p-0" align="start">
                                        <div className="p-4">
                                          <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                              <FileText className="h-5 w-5 text-green-500" />
                                              {group.source}
                                            </h3>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => toggleSourcePopover(group.file_id, false)}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                          
                                          <div className="space-y-4">
                                            {/* 기본 정보 */}
                                            <div>
                                              <h4 className="font-medium text-sm text-gray-600 mb-2">기본 정보</h4>
                                              <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                  <span className="text-gray-500">파일 ID:</span>
                                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                                    {group.file_id}
                                                  </code>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-gray-500">총 청크 수:</span>
                                                  <span className="font-medium">{group.chunks.length}개</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-gray-500">총 문자 수:</span>
                                                  <span className="font-medium">{group.total_chars.toLocaleString()}자</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-gray-500">생성일:</span>
                                                  <span>{group.timestamp !== 'N/A' ? new Date(group.timestamp).toLocaleString('ko-KR') : 'N/A'}</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* 통계 정보 */}
                                            <div>
                                              <h4 className="font-medium text-sm text-gray-600 mb-2">통계</h4>
                                              <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-green-50 p-3 rounded-lg">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <Archive className="h-4 w-4 text-green-500" />
                                                    <span className="text-sm font-medium text-green-700">청크</span>
                                                  </div>
                                                  <div className="text-lg font-bold text-green-900">
                                                    {group.chunks.length}
                                                  </div>
                                                  <div className="text-xs text-green-600">
                                                    평균 {Math.round(group.total_chars / group.chunks.length)}자/청크
                                                  </div>
                                                </div>
                                                <div className="bg-blue-50 p-3 rounded-lg">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <BookOpen className="h-4 w-4 text-blue-500" />
                                                    <span className="text-sm font-medium text-blue-700">문자</span>
                                                  </div>
                                                  <div className="text-lg font-bold text-blue-900">
                                                    {group.total_chars.toLocaleString()}
                                                  </div>
                                                  <div className="text-xs text-blue-600">
                                                    총 문자 수
                                                  </div>
                                                </div>
                                              </div>
                                            </div>

                                            {/* 청크 목록 */}
                                            <div>
                                              <h4 className="font-medium text-sm text-gray-600 mb-2">청크 목록 ({group.chunks.length}개)</h4>
                                              <ScrollArea className="h-40 w-full rounded border">
                                                <div className="p-2 space-y-2">
                                                  {group.chunks.map((chunk, index) => (
                                                    <div key={chunk.id} className="text-xs border rounded p-2 bg-gray-50">
                                                      <div className="flex justify-between items-start mb-1">
                                                        <span className="font-mono text-gray-500">#{index + 1}</span>
                                                        <code className="text-xs bg-white px-1 rounded">
                                                          {chunk.id.slice(0, 8)}...
                                                        </code>
                                                      </div>
                                                      <p className="text-gray-700 line-clamp-2">
                                                        {chunk.content.slice(0, 100)}{chunk.content.length > 100 ? '...' : ''}
                                                      </p>
                                                      <div className="text-gray-500 mt-1">
                                                        {chunk.content.length}자
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </ScrollArea>
                                            </div>
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="secondary" className="text-xs">
                                    <Archive className="w-3 h-3 mr-1" />
                                    {group.chunks.length} 청크
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {group.total_chars.toLocaleString()} 문자
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono">
                                  {group.file_id !== 'N/A' ? `${group.file_id.slice(0, 8)}...` : 'N/A'}
                                </code>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-xs text-gray-500">
                                  {group.timestamp !== 'N/A' ? new Date(group.timestamp).toLocaleString() : 'N/A'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    )}

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                          <div className="text-sm text-gray-500">
                            페이지 {currentPage} / {totalPages} (총 {filteredDocumentGroups.length}개 문서)
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              이전
                            </Button>
                            
                            <div className="flex items-center gap-1">
                              {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                                let pageNum
                                if (totalPages <= 5) {
                                  pageNum = idx + 1
                                } else if (currentPage <= 3) {
                                  pageNum = idx + 1
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + idx
                                } else {
                                  pageNum = currentPage - 2 + idx
                                }
                                
                                if (pageNum < 1 || pageNum > totalPages) return null
                                
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className="w-10"
                                  >
                                    {pageNum}
                                  </Button>
                                )
                              })}
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                            >
                              다음
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                  </TabsContent>

                  <TabsContent value="chunks" className="mt-6">
                    {/* Source Filter */}
                    {availableSources.length > 1 && (
                      <div className="mb-4 flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">소스 필터:</span>
                        <Select 
                          value={selectedSources.length === availableSources.length ? 'all' : selectedSources[0] || ''}
                          onValueChange={(value) => {
                            if (value === 'all') {
                              setSelectedSources(availableSources)
                            } else {
                              setSelectedSources([value])
                            }
                          }}
                        >
                          <SelectTrigger className="w-64">
                            <SelectValue>
                              {selectedSources.length === availableSources.length 
                                ? '모든 소스' 
                                : selectedSources.length === 1 
                                  ? selectedSources[0] 
                                  : `${selectedSources.length}개 소스 선택됨`}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">모든 소스</SelectItem>
                            {availableSources.map((source) => (
                              <SelectItem key={source} value={source}>
                                {source}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {filteredDocuments.length === 0 ? (
                      <EmptyChunksState />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="w-8 px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={paginatedDocuments.length > 0 && paginatedDocuments.every(d => selectedChunks.includes(d.id))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // 현재 페이지의 모든 항목을 선택
                                    const currentPageIds = paginatedDocuments.map(d => d.id)
                                    setSelectedChunks([...new Set([...selectedChunks, ...currentPageIds])])
                                  } else {
                                    // 현재 페이지의 모든 항목을 선택 해제
                                    const currentPageIds = paginatedDocuments.map(d => d.id)
                                    setSelectedChunks(selectedChunks.filter(id => !currentPageIds.includes(id)))
                                  }
                                }}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              내용 미리보기
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              문자 수
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              소스
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              타임스탬프
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginatedDocuments.map((doc) => (
                            <tr
                              key={doc.id}
                              className={`transition-colors hover:bg-gray-50/50 ${
                                selectedChunks.includes(doc.id) ? 'bg-purple-50/50' : ''
                              }`}
                            >
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedChunks.includes(doc.id)}
                                  onChange={() => toggleChunkSelection(doc.id)}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono">
                                  {doc.id.slice(0, 8)}...
                                </code>
                              </td>
                              <td className="px-4 py-4">
                                <Popover 
                                  open={openPopovers.has(doc.id)}
                                  onOpenChange={(isOpen) => togglePopover(doc.id, isOpen)}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      className="p-0 h-auto font-normal text-left justify-start max-w-md"
                                    >
                                      <div className="text-sm text-gray-900 truncate hover:text-blue-600 transition-colors cursor-pointer">
                                        {doc.content}
                                      </div>
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[700px] p-0" align="start">
                                    <div className="p-4">
                                      <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-semibold text-sm">청크 상세 정보</h4>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary" className="text-xs">
                                            {doc.content.length} 문자
                                          </Badge>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 hover:bg-gray-100"
                                            onClick={() => togglePopover(doc.id, false)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      <Tabs defaultValue="content" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2">
                                          <TabsTrigger value="content">내용</TabsTrigger>
                                          <TabsTrigger value="metadata">메타데이터</TabsTrigger>
                                        </TabsList>
                                        
                                        <TabsContent value="content" className="mt-4">
                                          <div className="space-y-3">
                                            <ScrollArea className="h-[350px] w-full border rounded-md p-4 bg-gray-50">
                                              <div className="text-sm text-gray-700 whitespace-pre-wrap pr-4">
                                                {doc.content}
                                              </div>
                                            </ScrollArea>
                                            
                                            {/* 기본 정보 */}
                                            <div className="bg-gray-50 rounded-md p-3 border">
                                              <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                  <span className="font-medium">문서 ID:</span>
                                                  <code className="bg-white px-2 py-1 rounded font-mono text-gray-700 border text-xs">
                                                    {doc.id}
                                                  </code>
                                                </div>
                                                {doc.metadata?.file_id && (
                                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <span className="font-medium">파일 ID:</span>
                                                    <code className="bg-white px-2 py-1 rounded font-mono text-gray-700 border text-xs">
                                                      {doc.metadata.file_id}
                                                    </code>
                                                  </div>
                                                )}
                                                {doc.metadata?.source && (
                                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <span className="font-medium">소스:</span>
                                                    <span className="text-gray-700">{doc.metadata.source}</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </TabsContent>
                                        
                                        <TabsContent value="metadata" className="mt-4">
                                          <ScrollArea className="h-[400px] w-full">
                                            <div className="space-y-3">
                                              <div className="bg-gray-50 rounded-md p-4 space-y-3">
                                                <div className="grid grid-cols-[140px_1fr] gap-3">
                                                  <span className="font-medium text-sm text-gray-600">문서 ID:</span>
                                                  <code className="bg-white px-2 py-1 rounded font-mono text-xs text-gray-700 border">
                                                    {doc.id}
                                                  </code>
                                                </div>
                                                
                                                {doc.metadata && Object.entries(doc.metadata).length > 0 ? (
                                                  Object.entries(doc.metadata).map(([key, value]) => (
                                                    <div key={key} className="grid grid-cols-[140px_1fr] gap-3">
                                                      <span className="font-medium text-sm text-gray-600">{key}:</span>
                                                      <div className="text-sm text-gray-700">
                                                        {typeof value === 'object' 
                                                          ? (
                                                            <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                                                              {JSON.stringify(value, null, 2)}
                                                            </pre>
                                                          )
                                                          : key === 'timestamp' && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)
                                                          ? (
                                                            <span className="text-gray-700">
                                                              {new Date(value).toLocaleString('ko-KR')}
                                                            </span>
                                                          )
                                                          : <span className="break-all">{String(value)}</span>
                                                        }
                                                      </div>
                                                    </div>
                                                  ))
                                                ) : (
                                                  <div className="text-sm text-gray-400 italic text-center py-8">
                                                    추가 메타데이터가 없습니다
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </ScrollArea>
                                        </TabsContent>
                                      </Tabs>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </td>
                              <td className="px-4 py-4">
                                <Badge variant="outline" className="text-xs">
                                  {doc.content.length}
                                </Badge>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-sm text-gray-500">
                                  {doc.metadata?.source || 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-xs text-gray-500">
                                  {doc.metadata?.timestamp ? new Date(doc.metadata.timestamp).toLocaleString() : 'N/A'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    )}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                          <div className="text-sm text-gray-500">
                            페이지 {currentPage} / {totalPages} (총 {filteredDocuments.length}개 청크)
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              이전
                            </Button>
                            
                            <div className="flex items-center gap-1">
                              {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                                let pageNum
                                if (totalPages <= 5) {
                                  pageNum = idx + 1
                                } else if (currentPage <= 3) {
                                  pageNum = idx + 1
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + idx
                                } else {
                                  pageNum = currentPage - 2 + idx
                                }
                                
                                if (pageNum < 1 || pageNum > totalPages) return null
                                
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className="w-10"
                                  >
                                    {pageNum}
                                  </Button>
                                )
                              })}
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                            >
                              다음
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Upload Document Modal */}
      <UploadDocumentModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        collections={collections}
        onSuccess={fetchDocuments}
      />
    </div>
  )
}