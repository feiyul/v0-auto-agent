"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, FormInput, Send, User, Bot, AlertCircle } from "lucide-react"
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
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const stepLabels: Record<WorkflowStep, string> = {
  idle: "待开始",
  analysis: "场景分析",
  suggestions: "优化建议",
  optimization: "智能优化",
}

export function HumanCollaboration({
  pendingTasks,
  onTaskComplete,
  onChatMessage,
  currentStep,
  isProcessing,
}: HumanCollaborationProps) {
  const [mode, setMode] = useState<"chat" | "form">("form")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({})

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
    if (step === "idle") {
      return "您好！请点击「开始优化」按钮启动优化流程。我会在流程中协助您进行决策。"
    }
    if (step === "analysis") {
      return `收到您的反馈。当前正在进行场景分析阶段，您可以通过表单模式确认分析结果，或继续在此对话中提供更多信息。`
    }
    if (step === "suggestions") {
      return `了解您的需求。我会将这些信息纳入优化建议的考虑范围。请在表单中选择您倾向的优化方向。`
    }
    return `感谢您的输入。当前正在执行优化，完成后请确认结果。`
  }

  const handleTaskSubmit = (taskId: string, option: string) => {
    const additionalInput = taskInputs[taskId]
    onTaskComplete(taskId, option, additionalInput)
    setTaskInputs((prev) => {
      const newInputs = { ...prev }
      delete newInputs[taskId]
      return newInputs
    })
  }

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">人机协同</h3>
          <Badge variant="outline" className="text-xs">
            {stepLabels[currentStep]}
          </Badge>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "chat" | "form")}>
          <TabsList className="h-8">
            <TabsTrigger value="form" className="gap-1.5 px-3 text-xs">
              <FormInput className="h-3.5 w-3.5" />
              表单模式
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5 px-3 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              对话模式
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === "form" ? (
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {pendingTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {currentStep === "idle"
                      ? "点击「开始优化」启动流程"
                      : isProcessing
                        ? "正在处理中，请稍候..."
                        : "暂无待处理任务"}
                  </p>
                </div>
              ) : (
                pendingTasks.map((task) => (
                  <Card key={task.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {stepLabels[task.step]}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <CardDescription>{task.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {task.requiresInput && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{task.inputLabel}</label>
                          <Textarea
                            placeholder={task.inputPlaceholder}
                            value={taskInputs[task.id] || ""}
                            onChange={(e) =>
                              setTaskInputs((prev) => ({
                                ...prev,
                                [task.id]: e.target.value,
                              }))
                            }
                            className="min-h-[80px] resize-none"
                          />
                        </div>
                      )}
                      {task.options && (
                        <div className="flex flex-wrap gap-2">
                          {task.options.map((option) => (
                            <Button
                              key={option}
                              variant={option.includes("确认") ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleTaskSubmit(task.id, option)}
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      通过对话方式进行协作
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      您可以提问、提供反馈或请求修改
                    </p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
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
                            : "bg-muted"
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="shrink-0 border-t bg-card p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="输入消息..."
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
        )}
      </div>
    </div>
  )
}
