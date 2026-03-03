"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CheckCircle2, Edit3, AlertCircle, Sparkles, ArrowUp, MessageSquare, ListChecks, Play, Calendar, Database, Trash2, FileText } from "lucide-react"
import type { PendingTask, WorkflowStep, OptimizationParams, OptimizationMethod, ModificationItem } from "@/app/page"

interface HumanCollaborationProps {
  pendingTasks: PendingTask[]
  onTaskComplete: (taskId: string, result: string, additionalInput?: string) => void
  onChatMessage: (message: string) => void
  onStartWorkflow: (params: OptimizationParams) => void
  currentStep: WorkflowStep
  isProcessing: boolean
  modifications?: ModificationItem[]
  onRemoveModification?: (id: string) => void
  onUpdateModification?: (id: string, modifiedContent: string) => void
}

interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  taskCard?: PendingTask
  isEditing?: boolean
}

type InteractionMode = "chat" | "form"

const stepLabels: Record<WorkflowStep, string> = {
  idle: "待开始",
  analysis: "场景分析",
  suggestions: "优化建议",
  optimization: "智能优化",
  confirmation: "人工确认",
}

const stepColors: Record<WorkflowStep, { bg: string; text: string; border: string }> = {
  idle: { bg: "bg-muted/50", text: "text-muted-foreground", border: "border-muted" },
  analysis: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  suggestions: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  optimization: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  confirmation: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
}

const WELCOME_MESSAGE = "您好！我是智能优化助手。请先配置优化参数并点击「开始优化」启动流程，我会在关键节点请求您的确认和反馈。"

export function HumanCollaboration({
  pendingTasks,
  onTaskComplete,
  onChatMessage,
  onStartWorkflow,
  currentStep,
  isProcessing,
  modifications = [],
  onRemoveModification,
  onUpdateModification,
}: HumanCollaborationProps) {
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<InteractionMode>("form")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({})
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const processedTaskIds = useRef<Set<string>>(new Set())

  // Start form state
  const [optimizationMethod, setOptimizationMethod] = useState<OptimizationMethod>("daily-report")
  const [dailyDate, setDailyDate] = useState("")
  const [businessScenario, setBusinessScenario] = useState("")
  const [sessionIds, setSessionIds] = useState("")
  const [manualAnalysis, setManualAnalysis] = useState("")

  useEffect(() => {
    setMounted(true)
    setChatMessages([
      {
        id: "welcome",
        role: "assistant",
        content: WELCOME_MESSAGE,
        timestamp: new Date(),
      },
    ])
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => {
    pendingTasks.forEach((task) => {
      if (!processedTaskIds.current.has(task.id)) {
        processedTaskIds.current.add(task.id)
        const taskMessage: ChatMessage = {
          id: `task-${task.id}`,
          role: "system",
          content: "",
          timestamp: new Date(),
          taskCard: task,
        }
        setChatMessages((prev) => [...prev, taskMessage])
      }
    })
  }, [pendingTasks])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [chatInput])

  const handleStartOptimization = () => {
    const params: OptimizationParams = {
      method: optimizationMethod,
      date: dailyDate,
      businessScenario,
      sessionIds,
      manualAnalysis,
    }
    onStartWorkflow(params)

    // Add start message to chat
    const startMessage: ChatMessage = {
      id: `start-${Date.now()}`,
      role: "assistant",
      content: optimizationMethod === "daily-report"
        ? `已启动优化流程。\n\n**优化方式**: 基于日报优化\n**日期**: ${dailyDate || "今日"}\n**业务场景**: ${businessScenario || "全部场景"}\n\n正在进行场景问题分析...`
        : `已启动优化流程。\n\n**优化方式**: 基于具体BadCase优化\n**SessionId**: ${sessionIds}\n${manualAnalysis ? `**人工分析**: ${manualAnalysis}` : ""}\n\n正在进行问题分析...`,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, startMessage])
  }

  const handleSendChat = () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, userMessage])
    onChatMessage(chatInput)
    setChatInput("")

    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAIResponse(chatInput, currentStep),
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, aiMessage])
    }, 1000)
  }

  const getAIResponse = (input: string, step: WorkflowStep): string => {
    if (input.includes("修改") || input.includes("调整")) {
      return "好的，我已记录您的修改意见。请在上方的确认卡片中点击「修改后确认」并填写具体修改内容，或直接告诉我您希望如何调整。"
    }
    if (input.includes("问题") || input.includes("为什么")) {
      return "这是一个好问题。基于当前的分析数据，我建议采用这种方案是因为它能更好地平衡响应速度和准确性。您可以在卡片中选择不同的优化方向。"
    }
    if (step === "idle") {
      return "请先配置优化参数，然后点击「开始优化」按钮启动流程。"
    }
    if (step === "analysis") {
      return "当前正在进行场景分析。分析完成后，我会发送确认卡片请您审核结果。如有特定关注点，请提前告诉我。"
    }
    if (step === "suggestions") {
      return "优化建议已生成。请在卡片中选择您倾向的优化方向，或告诉我您的具体需求。"
    }
    return "优化正在进行中。完成后我会发送确认卡片，请您验证结果是否符合预期。"
  }

  const handleTaskConfirm = (taskId: string, option: string) => {
    const additionalInput = taskInputs[taskId]
    onTaskComplete(taskId, option, additionalInput)
    
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === `task-${taskId}` && msg.taskCard
          ? { ...msg, taskCard: { ...msg.taskCard, completed: true, selectedOption: option } }
          : msg
      )
    )
    
    const confirmMessage: ChatMessage = {
      id: `confirm-${taskId}`,
      role: "assistant",
      content: additionalInput
        ? `已收到您的确认：「${option}」，并记录了您的补充意见。流程继续执行中...`
        : `已收到您的确认：「${option}」。流程继续执行中...`,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, confirmMessage])
    
    setTaskInputs((prev) => {
      const newInputs = { ...prev }
      delete newInputs[taskId]
      return newInputs
    })
    setEditingTaskId(null)
  }

  const toggleEditMode = (taskId: string) => {
    setEditingTaskId(editingTaskId === taskId ? null : taskId)
  }

  // Unified Task Card Component
  const renderTaskCard = (task: PendingTask & { completed?: boolean; selectedOption?: string }, compact = false) => {
    const isCompleted = task.completed
    const isEditing = editingTaskId === task.id
    const colors = stepColors[task.step]

    return (
      <Card
        className={cn(
          "w-full border shadow-sm transition-all duration-300 rounded-2xl overflow-hidden",
          isCompleted
            ? "bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border-emerald-200/60"
            : `bg-gradient-to-br from-card to-muted/20 ${colors.border}/40`
        )}
      >
        <CardHeader className={cn("pb-2", compact ? "px-4 pt-3" : "px-5 pt-4")}>
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] font-medium px-2.5 py-0.5 rounded-full border-0",
                isCompleted 
                  ? "bg-emerald-100/80 text-emerald-700" 
                  : `${colors.bg} ${colors.text}`
              )}
            >
              {isCompleted ? "已确认" : stepLabels[task.step]}
            </Badge>
            <div className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center",
              isCompleted ? "bg-emerald-100" : colors.bg
            )}>
              {isCompleted ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className={cn("h-3.5 w-3.5", colors.text)} />
              )}
            </div>
          </div>
          <CardTitle className={cn("font-semibold mt-2.5 text-foreground", compact ? "text-sm" : "text-base")}>{task.title}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
            {task.description}
          </CardDescription>
        </CardHeader>
        
        {!isCompleted && (
          <>
            <CardContent className={cn("space-y-3 pt-0 pb-2", compact ? "px-4" : "px-5")}>
              {(task.requiresInput || isEditing) && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    {task.inputLabel || "补充说明"}
                  </Label>
                  <Textarea
                    placeholder={task.inputPlaceholder || "输入您的修改意见..."}
                    value={taskInputs[task.id] || ""}
                    onChange={(e) =>
                      setTaskInputs((prev) => ({
                        ...prev,
                        [task.id]: e.target.value,
                      }))
                    }
                    className="min-h-[70px] resize-none text-sm bg-background/60 border-border/40 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                </div>
              )}
            </CardContent>
            
            <CardFooter className={cn("flex flex-wrap gap-2 pt-1 pb-4", compact ? "px-4" : "px-5")}>
              {task.options?.map((option) => {
                const isPrimary = option.includes("确认") || option.includes("同步") || option.includes("开始")
                return (
                  <Button
                    key={option}
                    variant={isPrimary ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "text-xs h-8 px-4 rounded-full transition-all font-medium",
                      isPrimary 
                        ? "shadow-sm hover:shadow" 
                        : "bg-background/60 hover:bg-background border-border/40"
                    )}
                    onClick={() => handleTaskConfirm(task.id, option)}
                  >
                    {option}
                  </Button>
                )
              })}
              {!task.requiresInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-xs h-8 text-muted-foreground hover:text-foreground rounded-full"
                  onClick={() => toggleEditMode(task.id)}
                >
                  <Edit3 className="mr-1.5 h-3 w-3" />
                  {isEditing ? "收起" : "补充"}
                </Button>
              )}
            </CardFooter>
          </>
        )}
        
        {isCompleted && task.selectedOption && (
          <CardContent className={cn("pb-4 pt-0", compact ? "px-4" : "px-5")}>
            <p className="text-xs text-muted-foreground">
              已选择：<span className="font-medium text-foreground/80">{task.selectedOption}</span>
            </p>
          </CardContent>
        )}
      </Card>
    )
  }

  // Unified Start Form Component
  const renderStartForm = () => {
    const canStart = optimizationMethod === "daily-report" 
      ? true
      : sessionIds.trim().length > 0

    return (
      <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/5 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="pb-3 pt-3 px-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Play className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">开始优化</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">配置参数并启动</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 px-4 pb-3">
          {/* Optimization Method - Compact */}
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-muted-foreground">优化方式</Label>
            <RadioGroup
              value={optimizationMethod}
              onValueChange={(v) => setOptimizationMethod(v as OptimizationMethod)}
              className="flex gap-2"
            >
              <label
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                  optimizationMethod === "daily-report" 
                    ? "border-primary bg-primary/5" 
                    : "border-border/50 hover:border-border"
                )}
              >
                <RadioGroupItem value="daily-report" id="daily-report" className="sr-only" />
                <Calendar className={cn(
                  "h-3.5 w-3.5",
                  optimizationMethod === "daily-report" ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  optimizationMethod === "daily-report" ? "text-primary" : "text-foreground"
                )}>日报优化</span>
              </label>
              <label
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                  optimizationMethod === "badcase" 
                    ? "border-primary bg-primary/5" 
                    : "border-border/50 hover:border-border"
                )}
              >
                <RadioGroupItem value="badcase" id="badcase" className="sr-only" />
                <Database className={cn(
                  "h-3.5 w-3.5",
                  optimizationMethod === "badcase" ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  optimizationMethod === "badcase" ? "text-primary" : "text-foreground"
                )}>BadCase</span>
              </label>
            </RadioGroup>
          </div>

          {/* Daily Report Params - Compact */}
          {optimizationMethod === "daily-report" && (
            <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">日期</Label>
                  <Input
                    type="date"
                    value={dailyDate}
                    onChange={(e) => setDailyDate(e.target.value)}
                    className="h-8 text-xs rounded-lg border-border/50 bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">业务场景</Label>
                  <Input
                    placeholder="退款、配送..."
                    value={businessScenario}
                    onChange={(e) => setBusinessScenario(e.target.value)}
                    className="h-8 text-xs rounded-lg border-border/50 bg-background"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BadCase Params - Compact */}
          {optimizationMethod === "badcase" && (
            <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  SessionId <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="多个用逗号或换行分隔..."
                  value={sessionIds}
                  onChange={(e) => setSessionIds(e.target.value)}
                  className="min-h-[60px] text-xs rounded-lg border-border/50 bg-background resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  问题分析 <span className="text-muted-foreground/60">（可选）</span>
                </Label>
                <Textarea
                  placeholder="输入初步分析..."
                  value={manualAnalysis}
                  onChange={(e) => setManualAnalysis(e.target.value)}
                  className="min-h-[50px] text-xs rounded-lg border-border/50 bg-background resize-none"
                />
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="px-4 pb-3 pt-0">
          <Button
            onClick={handleStartOptimization}
            disabled={!canStart || isProcessing}
            size="sm"
            className="w-full h-8 rounded-lg gap-1.5 text-xs font-medium"
          >
            <Play className="h-3.5 w-3.5" />
            开始优化
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Unified Modifications Display Component
  const renderModifications = () => {
    if (modifications.length === 0) return null

    return (
      <Card className="border border-violet-200/60 bg-gradient-to-br from-violet-50/50 to-purple-50/30 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
              <Edit3 className="h-4 w-4 text-violet-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold text-foreground">已添加的修改意见</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {modifications.length} 条意见，点击右侧版本对比添加更多
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0 space-y-3">
          {modifications.map((mod, idx) => (
            <div key={mod.id} className="p-4 bg-background/80 rounded-xl border border-border/30 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-700">
                    {idx + 1}
                  </span>
                  <p className="text-xs font-medium text-foreground">{mod.component}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0 hover:bg-destructive/10 hover:text-destructive rounded-lg"
                  onClick={() => onRemoveModification?.(mod.id)}
                >
                  <span className="sr-only">删除</span>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2.5 line-clamp-2 leading-relaxed">{mod.originalContent}</p>
              <Textarea
                value={mod.modifiedContent}
                onChange={(e) => onUpdateModification?.(mod.id, e.target.value)}
                placeholder="调整为..."
                className="min-h-[70px] text-sm rounded-xl border-border/30 bg-muted/20 focus-visible:ring-1 focus-visible:ring-violet-300 resize-none"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Form Mode View
  const renderFormMode = () => {
    const activeTasks = pendingTasks.filter(t => !(t as PendingTask & { completed?: boolean }).completed)
    const completedTasks = pendingTasks.filter(t => (t as PendingTask & { completed?: boolean }).completed)
    const showStartForm = currentStep === "idle" && activeTasks.length === 0
    const showModifications = currentStep === "confirmation" && modifications.length > 0

    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto p-5" ref={scrollRef}>
          <div className="space-y-5 max-w-xl mx-auto">
            {/* Start Form */}
            {showStartForm && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {renderStartForm()}
              </div>
            )}

            {/* Active Tasks */}
            {activeTasks.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">待处理任务</h3>
                </div>
                {activeTasks.map((task) => (
                  <div key={task.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {renderTaskCard(task as PendingTask & { completed?: boolean; selectedOption?: string }, false)}
                  </div>
                ))}
              </div>
            )}
            
            {/* Modifications Display */}
            {showModifications && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {renderModifications()}
              </div>
            )}
            
            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">已完成任务</h3>
                </div>
                {completedTasks.map((task) => (
                  <div key={task.id} className="opacity-60 hover:opacity-80 transition-opacity">
                    {renderTaskCard(task as PendingTask & { completed?: boolean; selectedOption?: string }, false)}
                  </div>
                ))}
              </div>
            )}
            
            {/* Empty state when workflow is running */}
            {!showStartForm && activeTasks.length === 0 && completedTasks.length === 0 && !showModifications && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
                  <ListChecks className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">流程执行中...</p>
                <p className="text-xs text-muted-foreground/70 mt-1.5">需要确认的任务将显示在这里</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Chat Mode View
  const renderChatMode = () => {
    const showStartCard = currentStep === "idle" && pendingTasks.length === 0
    const showModifications = currentStep === "confirmation" && modifications.length > 0

    return (
      <div className="flex h-full flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
            {chatMessages.map((message) => {
              // Task card
              if (message.taskCard) {
                return (
                  <div key={message.id} className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="text-sm font-semibold text-foreground">优化助手</span>
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 rounded-full bg-amber-100/80 text-amber-700 border-0">
                            需要确认
                          </Badge>
                        </div>
                        {renderTaskCard(message.taskCard as PendingTask & { completed?: boolean; selectedOption?: string })}
                      </div>
                    </div>
                  </div>
                )
              }

              // User message
              if (message.role === "user") {
                return (
                  <div key={message.id} className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="flex items-start gap-3 justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-lg bg-primary px-4 py-3 text-primary-foreground shadow-sm">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>
                )
              }

              // Assistant message
              return (
                <div key={message.id} className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary shadow-sm">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-foreground">优化助手</span>
                      </div>
                      <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Start Card in Chat Mode */}
            {showStartCard && (
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary shadow-sm">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-sm font-semibold text-foreground">优化助手</span>
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 rounded-full bg-primary/10 text-primary border-0">
                        配置参数
                      </Badge>
                    </div>
                    {renderStartForm()}
                  </div>
                </div>
              </div>
            )}

            {/* Modifications Display in Chat Mode */}
            {showModifications && (
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-500 shadow-sm">
                    <Edit3 className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-sm font-semibold text-foreground">修改意见</span>
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 rounded-full bg-violet-100/80 text-violet-700 border-0">
                        {modifications.length} 条
                      </Badge>
                    </div>
                    {renderModifications()}
                  </div>
                </div>
              </div>
            )}
            
            {/* Typing indicator */}
            {isProcessing && (
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary shadow-sm">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex items-center gap-1.5 py-2.5 px-4 bg-muted/40 rounded-2xl">
                    <div className="h-2 w-2 rounded-full bg-primary/50 animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 rounded-full bg-primary/50 animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 rounded-full bg-primary/50 animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="shrink-0 bg-gradient-to-t from-background to-transparent pt-2">
          <div className="max-w-2xl mx-auto px-5 pb-5">
            <div 
              className={cn(
                "relative flex items-end gap-2 rounded-2xl border bg-card transition-all duration-200",
                isFocused 
                  ? "border-primary/50 shadow-lg ring-2 ring-primary/10" 
                  : "border-border shadow-sm hover:shadow-md hover:border-border/80"
              )}
            >
              <textarea
                ref={textareaRef}
                placeholder="输入消息..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendChat()
                  }
                }}
                rows={1}
                className="flex-1 resize-none bg-transparent px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 max-h-[200px]"
                style={{ minHeight: "48px" }}
              />
              <div className="flex items-center gap-2 pr-2.5 pb-2.5">
                <Button
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-xl transition-all duration-200",
                    chatInput.trim() 
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow" 
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                  onClick={handleSendChat}
                  disabled={!chatInput.trim()}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-center text-[11px] text-muted-foreground/70 mt-2.5">
              按 Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="flex-1 p-6 space-y-6">
          <div className="flex gap-4 max-w-2xl mx-auto">
            <div className="h-8 w-8 bg-muted/30 animate-pulse rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-3/4 bg-muted/30 animate-pulse rounded-full" />
              <div className="h-4 w-1/2 bg-muted/30 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-background via-background to-muted/20">
      {/* Mode Toggle Header */}
      <div className="shrink-0 border-b border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-1.5 p-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 px-5 rounded-xl text-xs font-medium transition-all",
              mode === "chat" 
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            onClick={() => setMode("chat")}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            对话模式
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 px-5 rounded-xl text-xs font-medium transition-all",
              mode === "form" 
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            onClick={() => setMode("form")}
          >
            <ListChecks className="mr-2 h-4 w-4" />
            表单模式
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === "chat" ? renderChatMode() : renderFormMode()}
      </div>
    </div>
  )
}
