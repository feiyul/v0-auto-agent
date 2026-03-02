"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Search, Lightbulb, Zap, UserCheck, CheckCircle2, Loader2 } from "lucide-react"
import type { WorkflowStep } from "@/app/page"

interface WorkflowDiagramProps {
  currentStep: WorkflowStep
  isProcessing: boolean
  onStepClick?: (stepId: WorkflowStep) => void
  showConfirmationStep?: boolean
}

const steps = [
  {
    id: "analysis" as const,
    label: "场景问题分析",
    icon: Search,
    description: "分析客服对话数据，识别问题场景",
  },
  {
    id: "suggestions" as const,
    label: "优化建议",
    icon: Lightbulb,
    description: "生成针对性的优化建议方案",
  },
  {
    id: "optimization" as const,
    label: "智能优化",
    icon: Zap,
    description: "执行知识库和Prompt的自动优化",
  },
  {
    id: "confirmation" as const,
    label: "人工确认",
    icon: UserCheck,
    description: "查看版本对比，确认或调整优化内容",
  },
]

export function WorkflowDiagram({ currentStep, isProcessing, onStepClick, showConfirmationStep = false }: WorkflowDiagramProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getStepStatus = (stepId: WorkflowStep): "pending" | "processing" | "completed" => {
    const stepOrder = ["analysis", "suggestions", "optimization", "confirmation"]
    const currentIndex = stepOrder.indexOf(currentStep)
    const stepIndex = stepOrder.indexOf(stepId)

    if (currentStep === "idle") return "pending"
    if (stepIndex < currentIndex) return "completed"
    if (stepIndex === currentIndex) return "processing"
    return "pending"
  }

  const getStatusLabel = (status: "pending" | "processing" | "completed") => {
    switch (status) {
      case "pending":
        return "未开始"
      case "processing":
        return "进行中"
      case "completed":
        return "已完成"
    }
  }

  // Filter steps based on whether to show confirmation step
  const displayedSteps = showConfirmationStep 
    ? steps 
    : steps.filter(s => s.id !== "confirmation")

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-5 w-20 bg-muted/50 animate-pulse rounded-full" />
          <div className="h-10 w-28 bg-muted/50 animate-pulse rounded-full" />
        </div>
        <div className="flex items-start justify-between gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="h-14 w-14 bg-muted/50 animate-pulse rounded-2xl" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-16 bg-muted/50 animate-pulse rounded-full" />
                  <div className="h-3 w-20 bg-muted/50 animate-pulse rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">优化流程</h2>
      </div>

      <div className="flex items-start justify-between gap-3">
        {displayedSteps.map((step, index) => {
          const status = getStepStatus(step.id)
          const Icon = step.icon

          return (
            <div key={step.id} className="flex flex-1 items-start gap-3">
              <button 
                className="flex flex-col items-center group cursor-pointer"
                onClick={() => onStepClick?.(step.id)}
              >
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300",
                    status === "completed" && "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/20 group-hover:shadow-xl group-hover:scale-105",
                    status === "processing" && "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground shadow-lg shadow-primary/20 group-hover:shadow-xl group-hover:scale-105",
                    status === "pending" && "bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:scale-105"
                  )}
                >
                  {status === "completed" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : status === "processing" ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </div>
                <div className="mt-3 text-center">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      status === "completed" && "text-emerald-600",
                      status === "processing" && "text-primary",
                      status === "pending" && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  <span
                    className={cn(
                      "mt-1.5 inline-block rounded-full px-2.5 py-1 text-[10px] font-medium",
                      status === "completed" && "bg-emerald-100 text-emerald-700",
                      status === "processing" && "bg-primary/10 text-primary",
                      status === "pending" && "bg-muted/60 text-muted-foreground"
                    )}
                  >
                    {getStatusLabel(status)}
                  </span>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70 max-w-[110px]">
                    {step.description}
                  </p>
                </div>
              </button>
              {index < displayedSteps.length - 1 && (
                <div className="mt-7 flex-1 px-1">
                  <div
                    className={cn(
                      "h-1 w-full rounded-full transition-all duration-500",
                      getStepStatus(displayedSteps[index + 1].id) !== "pending"
                        ? "bg-gradient-to-r from-emerald-400 to-primary"
                        : "bg-muted/50"
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
