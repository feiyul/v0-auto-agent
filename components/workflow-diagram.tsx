"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Search, Lightbulb, Zap, UserCheck, CheckCircle2, Loader2, BarChart, Play, ClipboardCheck, GitMerge, FileText, RefreshCw, XCircle, Pencil, Upload } from "lucide-react"
import type { WorkflowStep, OptSubStepState } from "@/app/page"

interface WorkflowDiagramProps {
  currentStep: WorkflowStep
  isProcessing: boolean
  onStepClick?: (stepId: WorkflowStep) => void
  showConfirmationStep?: boolean
  showManualStep?: boolean
  showSyncStep?: boolean
  isCompleted?: boolean
  optSubStepState?: OptSubStepState
}

const steps = [
  {
    id: "analysis" as const,
    label: "问题分析",
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
    id: "manual" as const,
    label: "人工优化",
    icon: Pencil,
    description: "根据修改意见人工调整优化内容",
    optional: true,
  },
  {
    id: "confirmation" as const,
    label: "同步线上",
    icon: Upload,
    description: "确认优化内容并同步至线上环境",
  },
]

// 子流程步骤定义
const subSteps = [
  { id: "baseline", label: "基线分数生成", icon: BarChart },
  { id: "execute", label: "执行优化", icon: Play },
  { id: "evaluate", label: "效果评估", icon: ClipboardCheck },
  { id: "check", label: "是否达标", icon: GitMerge },
  { id: "report", label: "生成优化报告", icon: FileText },
]

// 循环步骤（2-4）
const loopStepIds = ["execute", "evaluate", "check"]

function OptSubStepPanel({ state, allDone }: { state: OptSubStepState; allDone?: boolean }) {
  const { subStep, round, passed } = state

  const getSubStatus = (id: string): "pending" | "processing" | "completed" | "failed" => {
    if (allDone) return "completed"
    if (subStep === "idle") return "pending"

    const order = ["baseline", "execute", "evaluate", "check", "report"]
    const currentIdx = order.indexOf(subStep)
    const thisIdx = order.indexOf(id)

    if (thisIdx < currentIdx) return "completed"
    if (thisIdx === currentIdx) {
      if (id === "check" && !passed && round > 0) return "failed"
      return "processing"
    }
    return "pending"
  }

  return (
    <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-1.5 mb-3">
        <Zap className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">智能优化子流程</span>
        {round > 0 && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            第 {round} 轮
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {subSteps.map((s, idx) => {
          const status = getSubStatus(s.id)
          const isLoop = loopStepIds.includes(s.id)

          return (
            <div key={s.id} className="flex items-center gap-1 flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                {/* Loop bracket above 2-4 */}
                {isLoop && (
                  <div className={cn(
                    "w-full flex justify-center mb-0.5",
                    s.id === "execute" ? "justify-start pl-2" :
                      s.id === "check" ? "justify-end pr-2" : "justify-center"
                  )}>
                    {s.id === "execute" && <span className="text-[9px] text-muted-foreground/60">↻ 循环</span>}
                    {s.id === "evaluate" && <div className="h-[1px] w-full bg-muted-foreground/20 mt-2" />}
                    {s.id === "check" && <span className="text-[9px] text-muted-foreground/60 opacity-0">x</span>}
                  </div>
                )}

                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 shrink-0",
                  status === "completed" && "bg-emerald-100 text-emerald-600",
                  status === "processing" && "bg-primary/15 text-primary ring-2 ring-primary/30",
                  status === "failed" && "bg-amber-100 text-amber-600",
                  status === "pending" && "bg-muted/50 text-muted-foreground/40",
                )}>
                  {status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                    status === "processing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                      status === "failed" ? <XCircle className="h-3.5 w-3.5" /> :
                        <s.icon className="h-3 w-3" />}
                </div>

                <p className={cn(
                  "mt-1 text-[10px] text-center leading-tight",
                  status === "completed" && "text-emerald-600",
                  status === "processing" && "text-primary font-medium",
                  status === "failed" && "text-amber-600",
                  status === "pending" && "text-muted-foreground/50",
                )}>
                  {s.label}
                  {status === "failed" && <span className="block text-[9px]">未达标</span>}
                </p>
              </div>

              {/* connector */}
              {idx < subSteps.length - 1 && (
                <div className={cn(
                  "h-px w-3 shrink-0 rounded-full mb-5 transition-colors duration-300",
                  getSubStatus(subSteps[idx + 1].id) !== "pending" || status === "completed"
                    ? "bg-primary/30"
                    : "bg-muted/40"
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function WorkflowDiagram({ currentStep, isProcessing, onStepClick, showConfirmationStep = false, showManualStep = false, showSyncStep = false, isCompleted = false, optSubStepState }: WorkflowDiagramProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getStepStatus = (stepId: WorkflowStep): "pending" | "processing" | "completed" => {
    if (isCompleted) return "completed"
    // manual 节点：当 currentStep === "manual" 时为 processing，optimization 之后选了人工优化即为 completed
    if (stepId === "manual") {
      if (currentStep === "manual") return "processing"
      if (currentStep === "confirmation") return "completed"
      return "pending"
    }
    // confirmation 节点映射到"同步线上"
    // manual/confirmation 阶段，optimization 应显示已完成
    const stepOrder = ["analysis", "suggestions", "optimization", "confirmation"]
    const mappedStep = currentStep === "manual" ? "confirmation" : currentStep
    const currentIndex = stepOrder.indexOf(mappedStep)
    const stepIndex = stepOrder.indexOf(stepId)

    if (currentStep === "idle") return "pending"
    if (stepIndex < currentIndex) return "completed"
    if (stepIndex === currentIndex) return isCompleted ? "completed" : "processing"
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

  // 按需组合展示的步骤
  const displayedSteps = steps.filter(s => {
    if (s.id === "manual") return showManualStep
    if (s.id === "confirmation") return showSyncStep || showConfirmationStep
    return true
  })

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
                  {'optional' in step && step.optional && (
                    <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-medium bg-orange-50 text-orange-500 border border-orange-100">
                      人工介入
                    </span>
                  )}
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

      {/* 智能优化子流程面板 */}
      {optSubStepState && optSubStepState.subStep !== "idle" && (
        <OptSubStepPanel
          state={optSubStepState}
          allDone={!isProcessing && optSubStepState.subStep === "report"}
        />
      )}
    </div>
  )
}
