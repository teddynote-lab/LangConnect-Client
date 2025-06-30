"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { 
  Folder,
  Code,
  Plus,
  Database
} from "lucide-react"

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
import { toast } from "sonner"

const formSchema = z.object({
  name: z.string().min(1, {
    message: "컬렉션 이름을 입력해주세요.",
  }),
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

interface CreateCollectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateCollectionModal({ open, onOpenChange, onSuccess }: CreateCollectionModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      metadata: "{}",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        body: JSON.stringify({
          name: values.name,
          metadata: JSON.parse(values.metadata)
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '컬렉션 생성에 실패했습니다.')
      }

      toast.success("컬렉션 생성 완료", {
        description: `'${values.name}' 컬렉션이 성공적으로 생성되었습니다.`,
      })
      
      onOpenChange(false)
      form.reset()
      onSuccess?.()
    } catch (error: any) {
      console.error("Failed to create collection:", error)
      toast.error("컬렉션 생성 실패", {
        description: error.message || "컬렉션 생성 중 오류가 발생했습니다.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden p-0">
        <DialogHeader className="relative p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">          
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg">
              <Folder className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                새 컬렉션 생성
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                새로운 문서 컬렉션을 생성합니다. 컬렉션 이름과 메타데이터를 입력해주세요.
              </DialogDescription>
            </div>
            <div className="ml-auto">
              <Database className="h-5 w-5 text-indigo-500 animate-pulse" />
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-blue-500" />
                      컬렉션 이름
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="컬렉션 이름을 입력하세요" 
                        className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      문서들을 그룹화할 컬렉션의 이름을 입력하세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="metadata"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-emerald-500" />
                      메타데이터 (JSON)
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder='{"category": "documents", "tag": "important"}' 
                        className="resize-none min-h-[100px] font-mono text-sm transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      컬렉션에 대한 추가 정보를 JSON 형식으로 입력하세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
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
                    disabled={isLoading}
                    size="sm"
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        컬렉션 생성
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