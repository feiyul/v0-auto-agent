"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, ScrollText, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import type { LogEntry, ReportSection, WorkflowStep } from "@/app/page"
import ReactMarkdown from "react-markdown"

interface LogsReportsTabsProps {
  logs: LogEntry[]
  reports: ReportSection[]
}

const stepLabels: Record<WorkflowStep, string> = {
  idle: "待开始",
  analysis: "场景分析",
  suggestions: "优化建议",
  optimization: "智能优化",
}

const logTypeConfig = {
  info: {
    icon: Info,
    className: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  warning: {
    icon: AlertTriangle,
    className: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  success: {
    icon: CheckCircle,
    className: "text-green-500",
    bg: "bg-green-500/10",
  },
  error: {
    icon: XCircle,
    className: "text-red-500",
    bg: "bg-red-500/10",
  },
}

export function LogsReportsTabs({ logs, reports }: LogsReportsTabsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatTime = (date: Date) => {
    if (!mounted) return "--:--:--"
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  if (!mounted) {
    return (
      <div className="flex h-full flex-col bg-card">
        <div className="shrink-0 border-b px-4">
          <div className="flex h-12 items-center gap-4">
            <div className="h-5 w-20 bg-muted animate-pulse rounded" />
            <div className="h-5 w-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-10 w-10 bg-muted animate-pulse rounded" />
            <div className="mt-3 h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <Tabs defaultValue="logs" className="flex h-full flex-col">
        <div className="shrink-0 border-b px-4">
          <TabsList className="h-12 w-full justify-start gap-4 rounded-none bg-transparent p-0">
            <TabsTrigger
              value="logs"
              className="gap-2 rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <ScrollText className="h-4 w-4" />
              执行日志
              {logs.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {logs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="gap-2 rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <FileText className="h-4 w-4" />
              报告输出
              {reports.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {reports.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="logs" className="mt-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-4">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ScrollText className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">暂无执行日志</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    开始优化流程后，日志将在此显示
                  </p>
                </div>
              ) : (
                logs.map((log) => {
                  const config = logTypeConfig[log.type]
                  const Icon = config.icon

                  return (
                    <div
                      key={log.id}
                      className={cn(
                        "flex items-start gap-3 rounded-md px-3 py-2 text-sm",
                        config.bg
                      )}
                    >
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.className)} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {stepLabels[log.step]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-foreground">{log.message}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="reports" className="mt-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">暂无报告输出</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    流程执行过程中会生成相关报告
                  </p>
                </div>
              ) : (
                reports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {stepLabels[report.step]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(report.timestamp)}
                        </span>
                      </div>
                      <CardTitle className="text-base">{report.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            h2: ({ children }) => (
                              <h2 className="mb-3 mt-4 text-base font-semibold first:mt-0">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="mb-2 mt-3 text-sm font-semibold">{children}</h3>
                            ),
                            h4: ({ children }) => (
                              <h4 className="mb-1 mt-2 text-sm font-medium">{children}</h4>
                            ),
                            p: ({ children }) => (
                              <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                                {children}
                              </p>
                            ),
                            ul: ({ children }) => (
                              <ul className="mb-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            strong: ({ children }) => (
                              <strong className="font-semibold text-foreground">{children}</strong>
                            ),
                          }}
                        >
                          {report.content}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
