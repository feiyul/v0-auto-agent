"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Sparkles } from "lucide-react"
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
      <div className="flex h-full flex-col bg-gradient-to-br from-background to-muted/30">
        <div className="shrink-0 px-8 py-6">
          <div className="h-7 w-28 bg-muted/30 animate-pulse rounded-full" />
          <div className="mt-2 h-4 w-52 bg-muted/30 animate-pulse rounded-full" />
        </div>
        <div className="flex-1 p-8">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-16 w-16 bg-muted/30 animate-pulse rounded-2xl" />
            <div className="mt-5 h-4 w-28 bg-muted/30 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-background to-muted/30">
      <div className="shrink-0 px-8 py-6">
        <h2 className="text-xl font-semibold text-foreground">优化报告</h2>
        <p className="mt-1 text-sm text-muted-foreground">查看任务的优化结果、指标与版本对比</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-8 pb-8">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-inner">
                <FileText className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="mt-5 text-base font-medium text-muted-foreground">暂无报告</p>
              <p className="mt-1.5 text-sm text-muted-foreground/60">
                开始优化流程后，报告将在此显示
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reports.map((report) => (
                <Card key={report.id} className="border-0 shadow-md rounded-3xl overflow-hidden bg-card hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="pb-4 pt-5 px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-xl",
                            report.step === "analysis" && "bg-gradient-to-br from-blue-400/20 to-cyan-400/20",
                            report.step === "suggestions" && "bg-gradient-to-br from-amber-400/20 to-orange-400/20",
                            report.step === "optimization" && "bg-gradient-to-br from-emerald-400/20 to-teal-400/20"
                          )}
                        >
                          <Sparkles 
                            className={cn(
                              "h-5 w-5",
                              report.step === "analysis" && "text-blue-500",
                              report.step === "suggestions" && "text-amber-500",
                              report.step === "optimization" && "text-emerald-500"
                            )} 
                          />
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs font-medium px-3 py-1 rounded-full border-0",
                            report.step === "analysis" && "bg-blue-100/80 text-blue-600",
                            report.step === "suggestions" && "bg-amber-100/80 text-amber-600",
                            report.step === "optimization" && "bg-emerald-100/80 text-emerald-600"
                          )}
                        >
                          {stepLabels[report.step]}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground/60">
                        {formatTime(report.timestamp)}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-semibold mt-4 text-foreground/90">{report.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          h2: ({ children }) => (
                            <h2 className="mb-4 mt-6 text-base font-semibold first:mt-0 text-foreground">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="mb-3 mt-5 text-sm font-semibold text-foreground/90">{children}</h3>
                          ),
                          h4: ({ children }) => (
                            <h4 className="mb-2 mt-4 text-sm font-medium text-foreground/80">{children}</h4>
                          ),
                          p: ({ children }) => (
                            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground/90">{children}</strong>
                          ),
                          code: ({ children }) => (
                            <code className="rounded-lg bg-muted/50 px-2 py-1 text-xs font-mono text-foreground/80">
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
