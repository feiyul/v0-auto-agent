"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileText, Sparkles, GitCompare, ChevronDown, ChevronUp, Upload, Pencil } from "lucide-react"
import type { ReportSection, WorkflowStep, ModificationItem } from "@/app/page"
import ReactMarkdown from "react-markdown"

interface ReportsPanelProps {
  reports: ReportSection[]
  showVersionComparison?: boolean
  onAddModification?: (modification: ModificationItem) => void
  modifications?: ModificationItem[]
  onRemoveModification?: (id: string) => void
  onUpdateModification?: (id: string, content: string) => void
  onStartManualOptimization?: (overallSuggestion: string) => void
}

const stepLabels: Record<WorkflowStep, string> = {
  idle: "待开始",
  analysis: "场景分析",
  suggestions: "优化建议",
  optimization: "智能优化",
  confirmation: "人工确认",
}

// Mock version comparison data
const versionComparisonData = {
  baseline: {
    version: "BASELINE",
    label: "对比版本",
    score: 62.5,
  },
  optimized: {
    version: "v2",
    label: "最优版本",
    score: 92.5,
    updateTime: "2026-02-05 17:43:40",
  },
  components: {
    agentPrompt: [
      { name: "外呼Agent", hasChange: false },
      { name: "智能总控Agent", hasChange: true },
    ],
    knowledgeBase: [
      { name: "取货场景知识", hasChange: false },
      { name: "投诉场景知识", hasChange: false },
      { name: "调度场景知识", hasChange: true },
    ],
    serviceStrategy: [
      { name: "多方案择优", hasChange: false },
      { name: "引导操作", hasChange: false },
      { name: "收尾祝福", hasChange: false },
      { name: "无能为力", hasChange: false },
      { name: "转人工挽回", hasChange: true },
      { name: "递进式沟通", hasChange: false },
    ],
  },
  selectedComponent: {
    name: "智能总控Agent",
    goal: "做出业务决策并产出策略路径",
    steps: [
      "首次决策：召回知识后需要做出新决策",
      "策略演进：状态变化需更新决策（如外呼结果返回）",
      "策略复用：商家追问进度/简单回应，复用 previous_solution_strategy 并输出话术",
      "注意：本步骤可能直接输出话术（need_retrieve_strategy=false）或触发服务策略召回（need_retrieve_strategy=true）",
    ],
    diffs: [
      {
        search: `决策依据：
• 首次决策：基于 retrieved_knowledge_content 生成全新的策略路径
• 策略演进：基于 previous_solution_strategy 更新阶段和决策要素`,
        replace: `决策依据：
• 信号核对（优先级最高）：决策前必须严格核对 system_signal 中的关键阈值（如{无骑手接单时长}是否达15分钟、{是否到店自取订单}、{商家主营品类}等），确保决策符合 SOP 逻辑，并在话术中体现规则透明化（如提及具体的等待时长要求）。
• 首次决策：基于 retrieved_knowledge_content 生成全新的策略路径
• 策略演进：基于 previous_solution_strategy 更新阶段和决策要素`,
      },
      {
        search: `5. 区分指令与情绪：区分商家的直接指令和情绪化表达，优先解决核心问题并安抚情绪。
6. 阶段流转（防死循环）：`,
        replace: `5. 区分指令与情绪：区分商家的直接指令和情绪化表达，优先解决核心问题并安抚情绪。
6. 严禁虚假承诺与口头执行：严禁在未实际调用工具的情况下向用户承诺任何系统操作（如扩大调度、加急、转单等）。若回复中包含"已为您执行XX"或"已为您处理"，则必须在 final_solution_actions 中同步输出对应工具，确保承诺与执行一致。
7. 阶段流转（防死循环）：`,
      },
    ],
  },
}

interface ModificationItem {
  id: string
  component: string
  originalContent: string
  modifiedContent: string
}

export function LogsReportsTabs({ 
  reports, 
  showVersionComparison = true, 
  onAddModification,
  modifications = [],
  onRemoveModification,
  onUpdateModification,
  onStartManualOptimization,
}: ReportsPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("reports")
  const [expandedDiffs, setExpandedDiffs] = useState<Record<number, boolean>>({})
  
  // Dialog states
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [manualOptDialogOpen, setManualOptDialogOpen] = useState(false)
  const [syncConfirmed, setSyncConfirmed] = useState(false)
  
  // Add modification dialog state
  const [addModDialogOpen, setAddModDialogOpen] = useState(false)
  const [pendingModification, setPendingModification] = useState<{component: string, originalContent: string} | null>(null)
  const [modificationContent, setModificationContent] = useState("")
  const [overallSuggestion, setOverallSuggestion] = useState("")

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

  const toggleDiff = (index: number) => {
    setExpandedDiffs(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const handleOpenAddModDialog = (component: string, originalContent: string) => {
    setPendingModification({ component, originalContent })
    setModificationContent("")
    setAddModDialogOpen(true)
  }

  const handleConfirmAddMod = () => {
    if (pendingModification && onAddModification) {
      onAddModification({
        id: Date.now().toString(),
        component: pendingModification.component,
        originalContent: pendingModification.originalContent,
        modifiedContent: modificationContent,
      })
    }
    setAddModDialogOpen(false)
    setPendingModification(null)
    setModificationContent("")
  }

  const handleSync = () => {
    // In real app, this would call an API
    console.log("Syncing to production...")
    setSyncDialogOpen(false)
    setSyncConfirmed(false)
  }

  const handleManualOptimize = () => {
    // In real app, this would trigger the manual optimization workflow
    console.log("Starting manual optimization with modifications:", modifications)
    console.log("Overall suggestion:", overallSuggestion)
    setManualOptDialogOpen(false)
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

  const hasOptimizationReport = reports.some(r => r.step === "optimization")

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gradient-to-br from-background to-muted/30">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        <div className="shrink-0 px-8 pt-6 pb-4">
          <TabsList className="w-full justify-start gap-2 bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="reports"
              className="gap-2 rounded-full px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <FileText className="h-4 w-4" />
              优化报告
            </TabsTrigger>
            <TabsTrigger 
              value="comparison"
              className="gap-2 rounded-full px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <GitCompare className="h-4 w-4" />
              版本对比
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="reports" className="flex-1 overflow-y-auto m-0 mt-0">
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
                  <Card key={report.id} className="border-0 shadow-md rounded-2xl overflow-hidden bg-card hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-4 pt-5 px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-xl",
                              report.step === "analysis" && "bg-gradient-to-br from-blue-400/20 to-cyan-400/20",
                              report.step === "suggestions" && "bg-gradient-to-br from-amber-400/20 to-orange-400/20",
                              report.step === "optimization" && "bg-gradient-to-br from-emerald-400/20 to-teal-400/20",
                              report.step === "confirmation" && "bg-gradient-to-br from-violet-400/20 to-purple-400/20"
                            )}
                          >
                            <Sparkles 
                              className={cn(
                                "h-5 w-5",
                                report.step === "analysis" && "text-blue-500",
                                report.step === "suggestions" && "text-amber-500",
                                report.step === "optimization" && "text-emerald-500",
                                report.step === "confirmation" && "text-violet-500"
                              )} 
                            />
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs font-medium px-3 py-1 rounded-full border-0",
                              report.step === "analysis" && "bg-blue-100/80 text-blue-600",
                              report.step === "suggestions" && "bg-amber-100/80 text-amber-600",
                              report.step === "optimization" && "bg-emerald-100/80 text-emerald-600",
                              report.step === "confirmation" && "bg-violet-100/80 text-violet-600"
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
        </TabsContent>

        <TabsContent value="comparison" className="flex-1 overflow-y-auto m-0 mt-0">
          <div className="px-8 pb-8">
            {!hasOptimizationReport ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-inner">
                  <GitCompare className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <p className="mt-5 text-base font-medium text-muted-foreground">暂无版本对比</p>
                <p className="mt-1.5 text-sm text-muted-foreground/60">
                  完成优化流程后，版本对比将在此显示
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">版本对比</h2>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="gap-2 rounded-full border-primary text-primary hover:bg-primary/5"
                      onClick={() => setManualOptDialogOpen(true)}
                    >
                      <Pencil className="h-4 w-4" />
                      人工优化
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 rounded-full"
                      onClick={() => setSyncDialogOpen(true)}
                    >
                      <Upload className="h-4 w-4" />
                      同步线上
                    </Button>
                  </div>
                </div>

                {/* Version Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border-2 border-red-200 bg-red-50/30 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-foreground">{versionComparisonData.baseline.version}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{versionComparisonData.baseline.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">评测分数</span>
                        <span className="ml-2 text-2xl font-bold text-red-500">{versionComparisonData.baseline.score}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-foreground">{versionComparisonData.optimized.version}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{versionComparisonData.optimized.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">评测分数</span>
                        <span className="ml-2 text-2xl font-bold text-blue-500">{versionComparisonData.optimized.score}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Component Tabs */}
                <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
                  <CardContent className="p-6">
                    {/* Agent Prompt */}
                    <div className="mb-5">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-medium text-foreground">AgentPrompt</span>
                        <div className="flex flex-wrap gap-2">
                          {versionComparisonData.components.agentPrompt.map((item) => (
                            <button
                              key={item.name}
                              onClick={() => item.hasChange && handleOpenAddModDialog(
                                `AgentPrompt / ${item.name}`,
                                "行为准则: 你是唯一的决策者，必须根据商家诉求动态选择知识库，严格依据知识库做出专业判断，并生成高质量话术。"
                              )}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                                item.hasChange 
                                  ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 cursor-pointer" 
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {item.name}
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-[10px] px-1.5 py-0 h-4 rounded-full",
                                  item.hasChange ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground"
                                )}
                              >
                                {item.hasChange ? "有变化" : "无变化"}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Knowledge Base */}
                    <div className="mb-5">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-medium text-foreground">业务场景知识库</span>
                        <div className="flex flex-wrap gap-2">
                          {versionComparisonData.components.knowledgeBase.map((item) => (
                            <button
                              key={item.name}
                              onClick={() => item.hasChange && handleOpenAddModDialog(
                                `知识库 / ${item.name}`,
                                "调度场景知识: 根据配送时间和距离等因素进行调度决策..."
                              )}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                                item.hasChange 
                                  ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 cursor-pointer" 
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {item.name}
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-[10px] px-1.5 py-0 h-4 rounded-full",
                                  item.hasChange ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground"
                                )}
                              >
                                {item.hasChange ? "有变化" : "无变化"}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Service Strategy */}
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-medium text-foreground">服务策略</span>
                        <div className="flex flex-wrap gap-2">
                          {versionComparisonData.components.serviceStrategy.map((item) => (
                            <button
                              key={item.name}
                              onClick={() => item.hasChange && handleOpenAddModDialog(
                                `服务策略 / ${item.name}`,
                                "转人工挽回策略: 根据用户情绪和问题复杂度决定是否转人工..."
                              )}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                                item.hasChange 
                                  ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 cursor-pointer" 
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {item.name}
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-[10px] px-1.5 py-0 h-4 rounded-full",
                                  item.hasChange ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground"
                                )}
                              >
                                {item.hasChange ? "有变化" : "无变化"}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Selected Component Details */}
                <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-foreground">{versionComparisonData.selectedComponent.name}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium">目标：</span>{versionComparisonData.selectedComponent.goal}
                      </p>
                    </div>

                    <div className="mb-5">
                      <p className="text-sm font-medium text-foreground mb-2">何时需要执行本步骤：</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {versionComparisonData.selectedComponent.steps.map((step, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground">{step}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Diff View */}
                    <div className="space-y-4">
                      {versionComparisonData.selectedComponent.diffs.map((diff, index) => (
                        <div key={index} className="rounded-xl border border-border overflow-hidden">
                          <button
                            onClick={() => toggleDiff(index)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm font-medium text-foreground">变更 {index + 1}</span>
                            {expandedDiffs[index] ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          {expandedDiffs[index] && (
                            <div className="grid grid-cols-2 divide-x divide-border">
                              <div className="p-4 bg-red-50/50">
                                <div className="mb-2 text-xs font-semibold text-red-600">SEARCH（原内容）</div>
                                <pre className="text-xs text-red-800 whitespace-pre-wrap font-mono leading-relaxed">
                                  {diff.search}
                                </pre>
                              </div>
                              <div className="p-4 bg-green-50/50">
                                <div className="mb-2 text-xs font-semibold text-green-600">REPLACE（新内容）</div>
                                <pre className="text-xs text-green-800 whitespace-pre-wrap font-mono leading-relaxed">
                                  {diff.replace}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Sync to Production Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">同步线上</DialogTitle>
            <DialogDescription className="sr-only">同步版本到生产环境</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-5 border border-blue-100">
              <p className="text-sm text-muted-foreground mb-3">即将同步至生产环境的版本</p>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-primary">{versionComparisonData.optimized.version}</span>
                <span className="text-sm text-muted-foreground">
                  更新时间：{versionComparisonData.optimized.updateTime}
                </span>
              </div>
            </div>
            
            <div className="mt-6 flex items-start gap-3">
              <Checkbox
                id="sync-confirm"
                checked={syncConfirmed}
                onCheckedChange={(checked) => setSyncConfirmed(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="sync-confirm" className="text-sm font-medium text-foreground cursor-pointer">
                我已确认版本差异无误，同意同步到线上
              </label>
            </div>
            
            <p className="mt-4 text-xs text-muted-foreground">
              请仔细检查上述变更内容，确认无误后勾选此选项以启用同步按钮。同步操作将影响生产环境，请谨慎操作。
            </p>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)} className="rounded-full">
              取消
            </Button>
            <Button 
              onClick={handleSync} 
              disabled={!syncConfirmed}
              className="rounded-full"
            >
              确认同步线上
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Optimization Dialog */}
      <Dialog open={manualOptDialogOpen} onOpenChange={setManualOptDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">人工优化</DialogTitle>
            <DialogDescription>
              查看并管理对版本对比内容的修改意见，填写总体修改建议后开始人工优化
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">v2 版本内容的优化评论</h4>
              {modifications.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-xl text-center">
                  暂无修改意见，点击版本对比中「有变化」的组件添加
                </div>
              ) : (
                <div className="space-y-4">
                  {modifications.map((mod, idx) => (
                    <div key={mod.id} className="p-4 border border-border rounded-xl">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <p className="text-sm font-medium text-foreground">
                          {idx + 1}. {mod.component}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => onRemoveModification?.(mod.id)}
                        >
                          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{mod.originalContent}</p>
                      <Textarea
                        value={mod.modifiedContent}
                        onChange={(e) => onUpdateModification?.(mod.id, e.target.value)}
                        placeholder="调整为..."
                        className="min-h-[80px] rounded-xl text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">总体修改建议</h4>
              <Textarea
                value={overallSuggestion}
                onChange={(e) => setOverallSuggestion(e.target.value)}
                placeholder="请输入对版本对比的总体修改建议（可选）"
                className="min-h-[120px] rounded-xl text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setManualOptDialogOpen(false)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button 
              onClick={() => {
                onStartManualOptimization?.(overallSuggestion)
                setManualOptDialogOpen(false)
                setOverallSuggestion("")
              }}
              className="rounded-full"
            >
              开始人工优化
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Modification Dialog */}
      <Dialog open={addModDialogOpen} onOpenChange={setAddModDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">添加修改意见</DialogTitle>
            <DialogDescription className="sr-only">添加组件修改意见</DialogDescription>
          </DialogHeader>
          {pendingModification && (
            <div className="py-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">文档：{pendingModification.component}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-2">选中的内容</p>
                <div className="p-3 bg-muted/30 rounded-xl text-sm text-muted-foreground">
                  {pendingModification.originalContent}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-2">修改意见</p>
                <Textarea
                  value={modificationContent}
                  onChange={(e) => setModificationContent(e.target.value)}
                  placeholder="调整为..."
                  className="min-h-[100px] rounded-xl text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddModDialogOpen(false)} className="rounded-full">
              取消
            </Button>
            <Button onClick={handleConfirmAddMod} className="rounded-full">
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
