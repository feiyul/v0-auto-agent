"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, User, Bot, CheckCircle2, Edit3, AlertTriangle } from "lucide-react"
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const processedTaskIds = useRef<Set<string>>(new Set())

  // Initialize on mount to avoid hydration mismatch
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  // Convert pending tasks to chat messages with cards
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

    // Simulate AI response
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
    
    // Update the task card to show completed state
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === `task-${taskId}` && msg.taskCard
          ? { ...msg, taskCard: { ...msg.taskCard, completed: true, selectedOption: option } }
          : msg
      )
    )
    
    // Add confirmation message
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
          "w-full max-w-md border-l-4 transition-all",
          isCompleted
            ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
            : "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge
              variant={isCompleted ? "default" : "secondary"}
              className={cn(
                "text-xs",
                isCompleted && "bg-green-600 hover:bg-green-600"
              )}
            >
              {isCompleted ? "已确认" : stepLabels[task.step]}
            </Badge>
            {isCompleted && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            {!isCompleted && (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
          </div>
          <CardTitle className="text-base">{task.title}</CardTitle>
          <CardDescription className="text-sm">{task.description}</CardDescription>
        </CardHeader>
        
        {!isCompleted && (
          <>
            <CardContent className="space-y-3 pt-2">
              {(task.requiresInput || isEditing) && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {task.inputLabel || "补充说明（可选）"}
                  </label>
                  <Textarea
                    placeholder={task.inputPlaceholder || "输入您的修改意见或补充信息..."}
                    value={taskInputs[task.id] || ""}
                    onChange={(e) =>
                      setTaskInputs((prev) => ({
                        ...prev,
                        [task.id]: e.target.value,
                      }))
                    }
                    className="min-h-[60px] resize-none text-sm"
                  />
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-wrap gap-2 pt-2">
              {task.options?.map((option) => (
                <Button
                  key={option}
                  variant={option.includes("确认") ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => handleTaskConfirm(task.id, option)}
                >
                  {option}
                </Button>
              ))}
              {!task.requiresInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-xs"
                  onClick={() => toggleEditMode(task.id)}
                >
                  <Edit3 className="mr-1 h-3 w-3" />
                  {isEditing ? "收起" : "添加修改意见"}
                </Button>
              )}
            </CardFooter>
          </>
        )}
        
        {isCompleted && task.selectedOption && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              已选择：<span className="font-medium text-foreground">{task.selectedOption}</span>
            </p>
          </CardContent>
        )}
      </Card>
    )
  }

  if (!mounted) {
    return (
      <div className="flex h-full flex-col bg-muted/30">
        <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 bg-muted animate-pulse rounded" />
            <div className="h-5 w-12 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          <div className="flex gap-3">
            <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t bg-card p-4">
          <div className="flex gap-2">
            <div className="h-10 flex-1 bg-muted animate-pulse rounded" />
            <div className="h-10 w-10 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">人机协同</h3>
          <Badge variant="outline" className="text-xs">
            {stepLabels[currentStep]}
          </Badge>
          {isProcessing && (
            <Badge variant="secondary" className="animate-pulse text-xs">
              处理中...
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-4 p-4">
          {chatMessages.map((message) => {
            // Render task card
            if (message.taskCard) {
              return (
                <div key={message.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                    <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="mb-2 text-xs text-muted-foreground">需要您的确认</p>
                    {renderTaskCard(message.taskCard as PendingTask & { completed?: boolean; selectedOption?: string })}
                  </div>
                </div>
              )
            }

            // Render regular chat messages
            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border"
                  )}
                >
                  {message.content}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t bg-card p-4">
        <div className="flex gap-2">
          <Input
            placeholder="输入消息或修改意见..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendChat()
              }
            }}
          />
          <Button size="icon" onClick={handleSendChat} disabled={!chatInput.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
