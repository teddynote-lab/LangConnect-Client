'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Plus, Trash2, Folder, FileText, Loader2, Database, FolderOpen, Archive, BookOpen, Info, X } from 'lucide-react'
import { CollectionWithStats, Collection } from '@/types/collection'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import { CreateCollectionModal } from '@/components/modals/create-collection-modal'

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Selection states
  const [selectedCollections, setSelectedCollections] = useState<string[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Popover states
  const [openPopovers, setOpenPopovers] = useState<Set<string>>(new Set())

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collections')
      const res = await response.json()
      if (!res.success) {
        toast.error("컬렉션 오류", {
          description: "컬렉션 조회 실패"
        })
        return
      }

      const collectionsData: Collection[] = res.data

      if (collectionsData.length === 0) {
        setCollections([])
        return
      }

      // Fetch stats for each collection
      const collectionsWithStats = await Promise.all(
        collectionsData.map(async (collection) => {
          try {
            // Fetch all documents using pagination
            const allDocuments: any[] = []
            let offset = 0
            const limit = 100

            while (true) {
              const documentsResponse = await fetch(
                `/api/collections/${collection.uuid}/documents?limit=${limit}&offset=${offset}`
              )
              const res = await documentsResponse.json()
              
              if (!res.success) {
                break
              }
              
              const documents = res.data
              if (!documents || documents.length === 0) {
                break
              }

              if (documents.length > 0 && offset === 0) {
                // console.log('First document structure:', JSON.stringify(documents[0], null, 2))
              }
              allDocuments.push(...documents)

              // If we got less than the limit, we've reached the end
              if (documents.length < limit) {
                break
              }

              offset += limit
            }
            
            const totalChunks = allDocuments.length
            
            // Count unique documents by file_id
            const uniqueFileIds = new Set<string>()
            allDocuments.forEach((doc: any) => {
              const fileId = doc.metadata?.file_id
              if (fileId) {
                uniqueFileIds.add(fileId)
              }
            })
            
            const totalDocuments = uniqueFileIds.size
            
            return {
              ...collection,
              stats: {
                documents: totalDocuments,
                chunks: totalChunks
              }
            }
          } catch (error) {
            console.error(`Failed to fetch stats for collection ${collection.name}:`, error)
            return {
              ...collection,
              stats: { documents: 0, chunks: 0 }
            }
          }
        })
      )

      setCollections(collectionsWithStats)
    } catch (error) {
      console.error('Failed to fetch collections:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchCollections()
  }

  const togglePopover = (collectionId: string, isOpen: boolean) => {
    setOpenPopovers(prev => {
      const newSet = new Set(prev)
      if (isOpen) {
        newSet.add(collectionId)
      } else {
        newSet.delete(collectionId)
      }
      return newSet
    })
  }


  const handleDeleteSelected = useCallback(async () => {
    if (selectedCollections.length === 0) return

    setDeleting(true)
    let deletedCount = 0
    let failedCount = 0

    for (const uuid of selectedCollections) {
      try {
        await fetch(`/api/collections/${uuid}`, {
          method: 'DELETE',
        })
        deletedCount++
      } catch (error) {
        failedCount++
        console.error(`Failed to delete collection ${uuid}:`, error)
      }
    }

    setDeleting(false)
    setShowDeleteConfirm(false)
    setSelectedCollections([])

    if (deletedCount > 0) {
      alert(`✅ ${deletedCount}개의 컬렉션이 성공적으로 삭제되었습니다.`)
    }
    if (failedCount > 0) {
      alert(`❌ ${failedCount}개의 컬렉션 삭제에 실패했습니다.`)
    }

    fetchCollections()
  }, [selectedCollections, fetchCollections])

  const toggleSelection = (uuid: string) => {
    setSelectedCollections(prev => 
      prev.includes(uuid) 
        ? prev.filter(id => id !== uuid)
        : [...prev, uuid]
    )
  }

  const selectedCollectionNames = selectedCollections.map(uuid => 
    collections.find(c => c.uuid === uuid)?.name || ''
  )

  // Statistics calculation
  const totalDocuments = collections.reduce((sum, collection) => sum + collection.stats.documents, 0)
  const totalChunks = collections.reduce((sum, collection) => sum + collection.stats.chunks, 0)

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-12" />
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
            <Skeleton className="h-4 w-6" />
          </div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Empty state component
  const EmptyState = () => (
    <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-blue-50 p-6 mb-4">
          <FolderOpen className="h-12 w-12 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">컬렉션이 없습니다</h3>
        <p className="text-gray-500 text-center mb-6 max-w-sm">
          첫 번째 컬렉션을 생성하여 문서들을 체계적으로 관리해보세요.
        </p>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          첫 컬렉션 만들기
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-500" />
              컬렉션 관리
            </h1>
            <p className="text-gray-600 mt-1">문서 컬렉션을 생성하고 관리하세요</p>
          </div>
          <div className="flex items-center gap-3">
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
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              새 컬렉션
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !refreshing && <LoadingSkeleton />}

        {/* Empty State */}
        {!loading && collections.length === 0 && <EmptyState />}

        {/* Content */}
        {!loading && collections.length > 0 && (
          <>
            {/* Statistics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">컬렉션</span>
                    <span className="font-semibold text-gray-900">{collections.length}</span>
                  </div>
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
                </div>
              </div>
            </div>

            {/* Collections Table Card */}
            <Card className="shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-500" />
                      컬렉션 목록
                    </CardTitle>
                    <CardDescription>
                      {selectedCollections.length > 0 
                        ? `${selectedCollections.length}개 선택됨` 
                        : `총 ${collections.length}개의 컬렉션`}
                    </CardDescription>
                  </div>
                  
                  {selectedCollections.length > 0 && (
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
                            ⚠️ 정말로 선택한 컬렉션을 삭제하시겠습니까? <strong>이 작업은 복구할 수 없습니다.</strong>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="my-4">
                          <p className="text-sm text-gray-600 mb-2">
                            삭제할 컬렉션 ({selectedCollections.length}개):
                          </p>
                          <ul className="text-sm text-gray-700 mb-3 list-disc pl-5">
                            {selectedCollectionNames.map((name, idx) => (
                              <li key={idx}>{name}</li>
                            ))}
                          </ul>
                          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            ℹ️ 삭제된 컬렉션의 모든 문서도 함께 삭제됩니다.
                          </div>
                        </div>
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="w-8 px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedCollections.length === collections.length && collections.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCollections(collections.map(c => c.uuid))
                              } else {
                                setSelectedCollections([])
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          컬렉션
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          통계
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          UUID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          메타데이터
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {collections.map((collection) => (
                        <tr
                          key={collection.uuid}
                          className={`transition-colors hover:bg-gray-50/50 ${
                            selectedCollections.includes(collection.uuid) ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedCollections.includes(collection.uuid)}
                              onChange={() => toggleSelection(collection.uuid)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                                  <Folder className="h-4 w-4 text-white" />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Popover 
                                  open={openPopovers.has(collection.uuid)}
                                  onOpenChange={(isOpen) => togglePopover(collection.uuid, isOpen)}
                                >
                                  <PopoverTrigger asChild>
                                    <button className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1">
                                      {collection.name}
                                      <Info className="h-3 w-3 text-gray-400" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[500px] p-0" align="start">
                                    <div className="p-4">
                                      <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                          <Folder className="h-5 w-5 text-blue-500" />
                                          {collection.name}
                                        </h3>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => togglePopover(collection.uuid, false)}
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
                                              <span className="text-gray-500">UUID:</span>
                                              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                                {collection.uuid}
                                              </code>
                                            </div>
                                          </div>
                                        </div>

                                        {/* 통계 정보 */}
                                        <div>
                                          <h4 className="font-medium text-sm text-gray-600 mb-2">통계</h4>
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-blue-50 p-3 rounded-lg">
                                              <div className="flex items-center gap-2 mb-1">
                                                <FileText className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm font-medium text-blue-700">문서</span>
                                              </div>
                                              <div className="text-lg font-bold text-blue-900">
                                                {collection.stats.documents}
                                              </div>
                                            </div>
                                            <div className="bg-purple-50 p-3 rounded-lg">
                                              <div className="flex items-center gap-2 mb-1">
                                                <Archive className="h-4 w-4 text-purple-500" />
                                                <span className="text-sm font-medium text-purple-700">청크</span>
                                              </div>
                                              <div className="text-lg font-bold text-purple-900">
                                                {collection.stats.chunks}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* 메타데이터 */}
                                        {collection.metadata && Object.keys(collection.metadata).length > 0 && (
                                          <div>
                                            <h4 className="font-medium text-sm text-gray-600 mb-2">메타데이터</h4>
                                            <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                                              {JSON.stringify(collection.metadata, null, 2)}
                                            </pre>
                                          </div>
                                        )}
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
                                <FileText className="w-3 h-3 mr-1" />
                                {collection.stats.documents} 문서
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {collection.stats.chunks} 청크
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono">
                              {collection.uuid.slice(0, 8)}...
                            </code>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs text-gray-500 max-w-xs truncate">
                              {Object.keys(collection.metadata || {}).length > 0 ? (
                                <code className="bg-gray-100 px-2 py-1 rounded">
                                  {JSON.stringify(collection.metadata)}
                                </code>
                              ) : (
                                <span className="text-gray-400 italic">없음</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Create Collection Modal */}
      <CreateCollectionModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={fetchCollections}
      />
    </div>
  )
}