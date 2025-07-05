"use client"

import * as React from "react"
import { toast as sonnerToast } from "sonner"

interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const toast = React.useCallback((props: ToastProps) => {
    const { title, description, variant = "default" } = props
    
    const message = title || description || ""
    const descriptionText = title && description ? description : undefined
    
    if (variant === "destructive") {
      sonnerToast.error(message, {
        description: descriptionText,
      })
    } else {
      sonnerToast.success(message, {
        description: descriptionText,
      })
    }
  }, [])

  return { toast }
}