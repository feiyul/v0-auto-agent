"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Send, CheckCircle2, Edit3, AlertTriangle, Sparkles, ArrowUp } from "lucide-react"
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

  // Auto-resize textarea
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

  const renderTaskCard = (task: PendingTask & { completed?: boolean; selectedOption?: string }) => {
    const isCompleted = task.completed
    const isEditing = editingTaskId === task.id

    return (
      <Card
        className={cn(
          "w-full border shadow-sm transition-all duration-200",
          isCompleted
            ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
            : "border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20"
        )}
      >
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] font-medium px-2 py-0.5",
                isCompleted 
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" 
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
              )}
            >
              {isCompleted ? "已确认" : stepLabels[task.step]}
            </Badge>
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <CardTitle className="text-sm font-semibold mt-2">{task.title}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground leading-relaxed">
            {task.description}
          </CardDescription>
        </CardHeader>
        
        {!isCompleted && (
          <>
            <CardContent className="space-y-3 pt-0 px-4 pb-2">
              {(task.requiresInput || isEditing) && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
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
                    className="min-h-[60px] resize-none text-xs bg-background/50 border-muted"
                  />
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-wrap gap-1.5 px-4 pb-3 pt-1">
              {task.options?.map((option) => (
                <Button
                  key={option}
                  variant={option.includes("确认") ? "default" : "outline"}
                  size="sm"
                  className="text-[11px] h-7 px-3"
                  onClick={() => handleTaskConfirm(task.id, option)}
                >
                  {option}
                </Button>
              ))}
              {!task.requiresInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-[11px] h-7 text-muted-foreground hover:text-foreground"
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
              已选择：<span className="font-medium text-foreground">{task.selectedOption}</span>
            </p>
          </CardContent>
        )}
      </Card>
    )
  }

  if (!mounted) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="flex-1 p-4 space-y-4">
          <div className="flex gap-3">
            <div className="h-6 w-6 bg-muted animate-pulse rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {chatMessages.map((message) => {
            // Task card
            if (message.taskCard) {
              return (
                <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-foreground">优化助手</span>
                        <span className="text-[10px] text-muted-foreground">需要确认</span>
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
                <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-start gap-3 justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              )
            }

            // Assistant message
            return (
              <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-foreground">优化助手</span>
                    </div>
                    <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          
          {/* Typing indicator when processing */}
          {isProcessing && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-1.5 py-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Cursor Style */}
      <div className="shrink-0 border-t bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto p-4">
          <div 
            className={cn(
              "relative flex items-end gap-2 rounded-2xl border bg-background shadow-sm transition-all duration-200",
              isFocused 
                ? "border-primary/50 ring-2 ring-primary/20" 
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <textarea
              ref={textareaRef}
              placeholder="发送消息..."
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
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 max-h-[200px]"
              style={{ minHeight: "44px" }}
            />
            <div className="flex items-center gap-1 pr-2 pb-2">
              <Button
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-xl transition-all duration-200",
                  chatInput.trim() 
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                onClick={handleSendChat}
                disabled={!chatInput.trim()}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            按 Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </div>
    </div>
  )
}
