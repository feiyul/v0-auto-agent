"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"
import type { ReportSection, WorkflowStep } from "@/app/page"
import ReactMarkdown from "react-markdown"

interface ReportsPanelProps {
  reports: ReportSection[]
}

const stepLabels: Record<WorkflowStep, string> = {
  idle: "待开始",
  analysis: "场景分析",
  suggestions: "优化建议",
  optimization: "智能优化",
}

export function LogsReportsTabs({ reports }: ReportsPanelProps) {
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
        <div className="shrink-0 border-b px-6 py-4">
          <div className="h-6 w-24 bg-muted animate-pulse rounded" />
          <div className="mt-1 h-4 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex-1 p-6">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-12 w-12 bg-muted animate-pulse rounded" />
            <div className="mt-4 h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="shrink-0 border-b px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">优化报告</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">查看任务的优化结果、指标与版本对比</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="mt-4 text-base font-medium text-muted-foreground">暂无报告</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                开始优化流程后，报告将在此显示
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reports.map((report) => (
                <Card key={report.id} className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs",
                          report.step === "analysis" && "bg-blue-500/10 text-blue-600",
                          report.step === "suggestions" && "bg-amber-500/10 text-amber-600",
                          report.step === "optimization" && "bg-green-500/10 text-green-600"
                        )}
                      >
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
                            <h2 className="mb-3 mt-4 text-base font-semibold first:mt-0 text-foreground">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="mb-2 mt-3 text-sm font-semibold text-foreground">{children}</h3>
                          ),
                          h4: ({ children }) => (
                            <h4 className="mb-1 mt-2 text-sm font-medium text-foreground">{children}</h4>
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
                          code: ({ children }) => (
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {report.content}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
