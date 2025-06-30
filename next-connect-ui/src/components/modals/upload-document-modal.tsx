"use client"

import { useState, useCallback } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Upload, FileText, Settings, Database, X } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

const formSchema = z.object({
  collectionId: z.string().min(1, {
    message: "컬렉션을 선택해주세요.",
  }),
  chunkSize: z.number().min(100).max(5000),
  chunkOverlap: z.number().min(0).max(1000),
  metadata: z.string().refine((value) => {
    try {
      JSON.parse(value)
      return true
    } catch {
      return false
    }
  }, {
    message: "올바른 JSON 형식을 입력해주세요.",
  }),
})

interface Collection {
  uuid: string
  name: string
}

interface UploadDocumentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collections: Collection[]
  onSuccess?: () => void
}

export function UploadDocumentModal({ 
  open, 
  onOpenChange, 
  collections,
  onSuccess 
}: UploadDocumentModalProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { data: session } = useSession()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      collectionId: "",
      chunkSize: 1000,
      chunkOverlap: 200,
      metadata: "[]",
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
    
    // Auto-generate metadata for new files
    const currentMetadata = JSON.parse(form.getValues("metadata") || "[]")
    const newMetadata = acceptedFiles.map(file => ({
      source: file.name,
      timestamp: new Date().toISOString()
    }))
    
    form.setValue("metadata", JSON.stringify([...currentMetadata, ...newMetadata], null, 2))
  }, [form])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  })

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    
    // Update metadata
    const currentMetadata = JSON.parse(form.getValues("metadata") || "[]")
    const newMetadata = currentMetadata.filter((_: any, i: number) => i !== index)
    form.setValue("metadata", JSON.stringify(newMetadata, null, 2))
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (files.length === 0) {
      toast.error("파일을 업로드해주세요")
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      
      // Add files
      files.forEach(file => {
        formData.append('files', file)
      })
      
      // Add other data
      formData.append('chunk_size', values.chunkSize.toString())
      formData.append('chunk_overlap', values.chunkOverlap.toString())
      formData.append('metadatas_json', values.metadata)

      const response = await fetch(`/api/collections/${values.collectionId}/documents`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '문서 업로드에 실패했습니다.')
      }

      toast.success("문서 업로드 완료", {
        description: `${files.length}개의 문서가 성공적으로 업로드되었습니다.`,
      })
      
      onOpenChange(false)
      form.reset()
      setFiles([])
      onSuccess?.()
    } catch (error: any) {
      console.error("Failed to upload documents:", error)
      toast.error("문서 업로드 실패", {
        description: error.message || "문서 업로드 중 오류가 발생했습니다.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    form.reset()
    setFiles([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                문서 업로드
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                문서를 업로드하고 임베딩을 생성합니다.
              </DialogDescription>
            </div>
            <div className="ml-auto">
              <Database className="h-5 w-5 text-emerald-500 animate-pulse" />
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="collectionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-500" />
                      컬렉션 선택
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="컬렉션을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {collections.map((collection) => (
                          <SelectItem key={collection.uuid} value={collection.uuid}>
                            {collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Upload Area */}
              <div className="space-y-4">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-500" />
                  파일 업로드
                </label>
                
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-green-400 hover:bg-green-50/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  {isDragActive ? (
                    <p className="text-green-600">파일을 여기에 놓으세요...</p>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-2">파일을 드래그하거나 클릭하여 업로드</p>
                      <p className="text-sm text-gray-500">PDF, TXT, MD, DOCX 파일 지원</p>
                    </>
                  )}
                </div>

                {/* Uploaded Files List */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">업로드된 파일 ({files.length}개)</label>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chunk Settings */}
              <div className="space-y-4">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4 text-purple-500" />
                  청크 설정
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="chunkSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>청크 크기</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min={100}
                            max={5000}
                            step={100}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>각 청크의 최대 문자 수</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="chunkOverlap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>청크 중복</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min={0}
                            max={1000}
                            step={50}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>청크 간 중복되는 문자 수</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="metadata"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>메타데이터 (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        rows={6}
                        className="font-mono text-sm"
                        placeholder='[{"source": "filename.pdf", "timestamp": "2024-01-01T00:00:00.000Z"}]'
                      />
                    </FormControl>
                    <FormDescription>
                      각 파일에 대한 메타데이터를 JSON 배열 형식으로 입력하세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-6 border-t">
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="flex-1 sm:flex-initial"
                  >
                    취소
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading || files.length === 0}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        문서 업로드
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}