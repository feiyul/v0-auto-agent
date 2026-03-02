"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Search, Lightbulb, Zap, Play, CheckCircle2, Loader2 } from "lucide-react"
import type { WorkflowStep } from "@/app/page"

interface WorkflowDiagramProps {
  currentStep: WorkflowStep
  isProcessing: boolean
  onStart: () => void
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
]

export function WorkflowDiagram({ currentStep, isProcessing, onStart }: WorkflowDiagramProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getStepStatus = (stepId: WorkflowStep): "pending" | "processing" | "completed" => {
    const stepOrder = ["analysis", "suggestions", "optimization"]
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

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-20 bg-muted animate-pulse rounded" />
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex items-start justify-between gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 items-start gap-2">
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                <div className="mt-2 space-y-1">
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">优化流程</h2>
        <Button
          size="sm"
          onClick={onStart}
          disabled={currentStep !== "idle" || isProcessing}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          开始优化
        </Button>
      </div>

      <div className="flex items-start justify-between gap-2">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id)
          const Icon = step.icon

          return (
            <div key={step.id} className="flex flex-1 items-start gap-2">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    status === "completed" && "border-primary bg-primary text-primary-foreground",
                    status === "processing" && "border-primary bg-primary/10 text-primary",
                    status === "pending" && "border-muted-foreground/30 bg-muted text-muted-foreground"
                  )}
                >
                  {status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : status === "processing" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      status === "completed" && "text-primary",
                      status === "processing" && "text-primary",
                      status === "pending" && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  <span
                    className={cn(
                      "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                      status === "completed" && "bg-primary/10 text-primary",
                      status === "processing" && "bg-amber-500/10 text-amber-600",
                      status === "pending" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {getStatusLabel(status)}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground/70 max-w-[120px]">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="mt-5 flex-1 px-2">
                  <div
                    className={cn(
                      "h-0.5 w-full transition-colors",
                      getStepStatus(steps[index + 1].id) !== "pending"
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
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
