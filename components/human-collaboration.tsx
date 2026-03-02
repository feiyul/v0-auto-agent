"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Edit3, AlertCircle, Sparkles, ArrowUp, MessageSquare, ListChecks } from "lucide-react"
import type { PendingTask, WorkflowStep } from "@/app/page"

interface HumanCollaborationProps {
  pendingTasks: PendingTask[]
  onTaskComplete: (taskId: string, result: string, additionalInput?: string) => void
  onChatMessage: (message: string) => void
  currentStep: WorkflowStep
  isProcessing: boolean
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
}

const WELCOME_MESSAGE = "您好！我是智能优化助手。点击「开始优化」启动流程后，我会在关键节点请求您的确认和反馈。您也可以随时在对话中提出问题或修改意见。"

export function HumanCollaboration({
  pendingTasks,
  onTaskComplete,
  onChatMessage,
  currentStep,
  isProcessing,
}: HumanCollaborationProps) {
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<InteractionMode>("chat")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({})
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const processedTaskIds = useRef<Set<string>>(new Set())

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
      return "请点击「开始优化」按钮启动优化流程。我会在需要您决策时发送确认卡片。"
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

  const renderTaskCard = (task: PendingTask & { completed?: boolean; selectedOption?: string }, compact = false) => {
    const isCompleted = task.completed
    const isEditing = editingTaskId === task.id

    return (
      <Card
        className={cn(
          "w-full border shadow-sm transition-all duration-300 rounded-2xl overflow-hidden",
          isCompleted
            ? "bg-gradient-to-br from-emerald-50 to-teal-50/50 border-emerald-200/50"
            : "bg-gradient-to-br from-amber-50/80 to-orange-50/50 border-amber-200/50"
        )}
      >
        <CardHeader className={cn("pb-2 px-4", compact ? "pt-3" : "pt-4")}>
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] font-medium px-2.5 py-0.5 rounded-full border-0",
                isCompleted 
                  ? "bg-emerald-100/80 text-emerald-700" 
                  : "bg-amber-100/80 text-amber-700"
              )}
            >
              {isCompleted ? "已确认" : stepLabels[task.step]}
            </Badge>
            {isCompleted ? (
              <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </div>
            ) : (
              <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              </div>
            )}
          </div>
          <CardTitle className={cn("font-semibold mt-2 text-foreground", compact ? "text-xs" : "text-sm")}>{task.title}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
            {task.description}
          </CardDescription>
        </CardHeader>
        
        {!isCompleted && (
          <>
            <CardContent className="space-y-2 pt-0 px-4 pb-2">
              {(task.requiresInput || isEditing) && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {task.inputLabel || "补充说明"}
                  </label>
                  <Textarea
                    placeholder={task.inputPlaceholder || "输入您的修改意见..."}
                    value={taskInputs[task.id] || ""}
                    onChange={(e) =>
                      setTaskInputs((prev) => ({
                        ...prev,
                        [task.id]: e.target.value,
                      }))
                    }
                    className="min-h-[60px] resize-none text-xs bg-white/60 border-border/50 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-wrap gap-1.5 px-4 pb-3 pt-1">
              {task.options?.map((option) => (
                <Button
                  key={option}
                  variant={option.includes("确认") ? "default" : "secondary"}
                  size="sm"
                  className={cn(
                    "text-[11px] h-7 px-3 rounded-full transition-all",
                    option.includes("确认") 
                      ? "shadow-sm hover:shadow" 
                      : "bg-white/60 hover:bg-white/80 border-border/30"
                  )}
                  onClick={() => handleTaskConfirm(task.id, option)}
                >
                  {option}
                </Button>
              ))}
              {!task.requiresInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-[11px] h-7 text-muted-foreground hover:text-foreground rounded-full"
                  onClick={() => toggleEditMode(task.id)}
                >
                  <Edit3 className="mr-1 h-3 w-3" />
                  {isEditing ? "收起" : "修改"}
                </Button>
              )}
            </CardFooter>
          </>
        )}
        
        {isCompleted && task.selectedOption && (
          <CardContent className="px-4 pb-3 pt-0">
            <p className="text-[11px] text-muted-foreground">
              已选择：<span className="font-medium text-foreground/80">{task.selectedOption}</span>
            </p>
          </CardContent>
        )}
      </Card>
    )
  }

  // Form Mode View
  const renderFormMode = () => {
    const activeTasks = pendingTasks.filter(t => !(t as PendingTask & { completed?: boolean }).completed)
    const completedTasks = pendingTasks.filter(t => (t as PendingTask & { completed?: boolean }).completed)

    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
          <div className="space-y-4">
            {activeTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">待处理任务</h3>
                {activeTasks.map((task) => (
                  <div key={task.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {renderTaskCard(task as PendingTask & { completed?: boolean; selectedOption?: string }, true)}
                  </div>
                ))}
              </div>
            )}
            
            {completedTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">已完成任务</h3>
                {completedTasks.map((task) => (
                  <div key={task.id} className="opacity-70">
                    {renderTaskCard(task as PendingTask & { completed?: boolean; selectedOption?: string }, true)}
                  </div>
                ))}
              </div>
            )}
            
            {activeTasks.length === 0 && completedTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <ListChecks className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">暂无待处理任务</p>
                <p className="text-xs text-muted-foreground/70 mt-1">启动优化流程后，需要确认的任务将显示在这里</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Chat Mode View
  const renderChatMode = () => {
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
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-500/20">
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-foreground">优化助手</span>
                          <span className="text-xs text-muted-foreground">需要确认</span>
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
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground shadow-sm shadow-primary/20">
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
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary shadow-sm shadow-primary/20">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-medium text-foreground">优化助手</span>
                      </div>
                      <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Typing indicator */}
            {isProcessing && (
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary shadow-sm shadow-primary/20">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex items-center gap-1.5 py-2 px-3 bg-muted/40 rounded-xl">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="shrink-0 bg-transparent">
          <div className="max-w-2xl mx-auto px-5 pb-4">
            <div 
              className={cn(
                "relative flex items-end gap-2 rounded-2xl border bg-card transition-all duration-200",
                isFocused 
                  ? "border-primary/50 shadow-md ring-1 ring-primary/10" 
                  : "border-border shadow-sm hover:border-border/80 hover:shadow"
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
                className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 max-h-[200px]"
                style={{ minHeight: "44px" }}
              />
              <div className="flex items-center gap-2 pr-2 pb-2">
                <Button
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full transition-all duration-200",
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
            <p className="text-center text-[11px] text-muted-foreground mt-2">
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
    <div className="flex h-full flex-col bg-gradient-to-b from-background to-muted/10">
      {/* Mode Toggle Header */}
      <div className="shrink-0 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-1 p-2">
          <Button
            variant={mode === "chat" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-8 px-4 rounded-full text-xs font-medium transition-all",
              mode === "chat" 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode("chat")}
          >
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            对话模式
          </Button>
          <Button
            variant={mode === "form" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-8 px-4 rounded-full text-xs font-medium transition-all",
              mode === "form" 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode("form")}
          >
            <ListChecks className="mr-1.5 h-3.5 w-3.5" />
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
