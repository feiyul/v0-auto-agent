"use client"

import { useState, useRef } from "react"
import { WorkflowDiagram } from "@/components/workflow-diagram"
import { HumanCollaboration } from "@/components/human-collaboration"
import { LogsReportsTabs } from "@/components/logs-reports-tabs"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Sparkles } from "lucide-react"

export type WorkflowStep = "analysis" | "suggestions" | "optimization" | "confirmation" | "idle"

export interface ReportSection {
  id: string
  title: string
  step: WorkflowStep
  content: string
  timestamp: Date
}

export interface PendingTask {
  id: string
  step: WorkflowStep
  title: string
  description: string
  options?: string[]
  requiresInput?: boolean
  inputLabel?: string
  inputPlaceholder?: string
}

export type OptimizationMethod = "daily-report" | "badcase"

export interface OptimizationParams {
  method: OptimizationMethod
  // 日报优化参数
  date?: string
  businessScenario?: string
  // BadCase优化参数
  sessionIds?: string
  manualAnalysis?: string
}

export interface ModificationItem {
  id: string
  component: string
  originalContent: string
  modifiedContent: string
}

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("idle")
  const [reports, setReports] = useState<ReportSection[]>([])
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [modifications, setModifications] = useState<ModificationItem[]>([])
  const reportIdCounter = useRef(0)

  const addReport = (step: WorkflowStep, title: string, content: string) => {
    reportIdCounter.current += 1
    const newReport: ReportSection = {
      id: `report-${Date.now()}-${reportIdCounter.current}`,
      title,
      step,
      content,
      timestamp: new Date(),
    }
    setReports((prev) => [...prev, newReport])
  }

  const startWorkflow = (params: OptimizationParams) => {
    setIsProcessing(true)
    setCurrentStep("analysis")

    // Store params for later use if needed
    // params can be used for customized analysis based on method

    setTimeout(() => {
      setTimeout(() => {
        const analysisContent = params.method === "daily-report"
          ? `## 分析结果\n\n**优化方式**: 基于日报优化\n**日期**: ${params.date || "未指定"}\n**业务场景**: ${params.businessScenario || "全部场景"}\n\n### 识别的问题场景\n\n1. **退款流程咨询** - 占比35%\n   - 用户对退款时间和流程不清楚\n   - 当前回复模板过于笼统\n\n2. **产品功能疑问** - 占比28%\n   - 新功能说明不够详细\n   - 缺少示例说明\n\n3. **账户问题处理** - 占比22%\n   - 密码重置流程复杂\n   - 安全验证步骤说明不清\n\n### 建议优化方向\n- 细化退款场景的回复模板\n- 增加功能说明的具体示例\n- 简化账户问题的处理流程说明`
          : `## 分析结果\n\n**优化方式**: 基于具体BadCase优化\n**SessionId集合**: ${params.sessionIds || "未指定"}\n${params.manualAnalysis ? `**人工分析**: ${params.manualAnalysis}` : ""}\n\n### 问题Case分析\n\n1. **执行-动作未执行/虚假承诺** - 3个Case\n   - Agent在话术中承诺"已扩大调度范围"，但未在final_solution_actions中调用对应的执行工具\n   - 导致口头承诺与实际动作脱节\n\n2. **感知-业务信号缺失** - 2个Case\n   - Agent忽略了{无骑手接单时长}、{是否到店自取订单}等关键业务信号\n   - 未能根据SOP要求的15分钟阈值准确区分"扩大调度"与"加急调度"\n\n3. **交互-规则透明化不足** - 1个Case\n   - 回复中缺乏对业务规则（如等待时长阈值）的解释\n   - 导致商家对处理逻辑缺乏预期\n\n### 建议优化方向\n- 强化执行铁律，确保承诺与工具调用同步\n- 提升信号感知优先级\n- 规范工具调用逻辑`
        
        addReport(
          "analysis",
          "场景问题分析报告",
          analysisContent
        )

        setPendingTasks([
          {
            id: "task-1",
            step: "analysis",
            title: "确认分析结果",
            description: "请确认以上分析结果是否准确，或提供修改意见",
            options: ["确认分析结果", "需要重新分析"],
            requiresInput: true,
            inputLabel: "修改意见（可选）",
            inputPlaceholder: "如有补充或修改意见，请在此输入...",
          },
        ])
        setIsProcessing(false)
      }, 1500)
    }, 1000)
  }

  const handleTaskComplete = (taskId: string, result: string, additionalInput?: string) => {
    const task = pendingTasks.find((t) => t.id === taskId)
    if (!task) return

    setPendingTasks((prev) => prev.filter((t) => t.id !== taskId))

    if (task.step === "analysis" && result === "确认分析结果") {
      proceedToSuggestions()
    } else if (task.step === "suggestions" && result === "确认优化建议") {
      proceedToOptimization()
    } else if (task.step === "optimization") {
      proceedToConfirmation()
    } else if (task.step === "confirmation") {
      if (result === "添加修改意见重新优化") {
        // Re-run optimization with modifications
        reOptimizeWithModifications(additionalInput)
      } else {
        completeWorkflow()
      }
    }
  }

  const proceedToSuggestions = () => {
    setIsProcessing(true)
    setCurrentStep("suggestions")

    setTimeout(() => {
      setTimeout(() => {
        addReport(
          "suggestions",
          "优化建议报告",
          `## 优化建议\n\n### 1. 退款场景优化\n**当前问题**: 回复过于笼统，用户需要多次追问\n**建议**: 创建分级回复模板，根据退款原因自动匹配详细流程\n\n### 2. 知识库更新\n**当前问题**: 产品功能说明滞后于版本更新\n**建议**: 建立功能更新与知识库同步机制\n\n### 3. Prompt优化\n**当前问题**: 智能回复缺少上下文理解\n**建议**: 增加对话历史分析，提升回复相关性\n\n### 4. 多轮对话优化\n**当前问题**: 复杂问题需要多次交互\n**建议**: 预测用户后续问题，主动提供相关信息\n\n### 5. 情感分析增强\n**当前问题**: 未识别用户情绪状态\n**建议**: 集成情感分析，对负面情绪用户优先处理`
        )

        setPendingTasks([
          {
            id: "task-2",
            step: "suggestions",
            title: "选择优化方案",
            description: "请选择需要执行的优化建议，或提供自定义优化方向",
            options: ["确认优化建议", "自定义优化方案"],
            requiresInput: true,
            inputLabel: "自定义优化方向（可选）",
            inputPlaceholder: "请输入您的优化想法或补充建议...",
          },
        ])
        setIsProcessing(false)
      }, 1500)
    }, 1000)
  }

  const proceedToOptimization = () => {
    setIsProcessing(true)
    setCurrentStep("optimization")

    setTimeout(() => {
      setTimeout(() => {
        setTimeout(() => {
          addReport(
            "optimization",
            "优化执行报告",
            `## 优化执行结果\n\n### 已完成的优化\n\n#### 1. 知识库更新\n- 新增退款流程详细说明 3 条\n- 更新产品功能文档 12 条\n- 新增常见问题 FAQ 8 条\n\n#### 2. Prompt模板优化\n- 退款场景Prompt优化完成\n- 产品咨询Prompt优化完成\n- 账户问题Prompt优化完成\n\n#### 3. 预期效果\n- 预计首次响应准确率提升 15%\n- 预计平均对话轮次减少 2.3 轮\n- 预计用户满意度提升 8%\n\n### 下一步建议\n- 监控优化效果 7 天\n- 收集用户反馈\n- 根据数据调整优化策略`
          )

          setPendingTasks([
            {
              id: "task-3",
              step: "optimization",
              title: "确认优化结果",
              description: "智能优化已完成，请确认结果并进入人工确认阶段",
              options: ["进入人工确认", "需要调整"],
              requiresInput: true,
              inputLabel: "调整需求（可选）",
              inputPlaceholder: "如需调整，请描述具体需求...",
            },
          ])
          setIsProcessing(false)
        }, 1500)
      }, 1500)
    }, 1000)
  }

  const proceedToConfirmation = () => {
    setIsProcessing(true)
    setCurrentStep("confirmation")

    setTimeout(() => {
      addReport(
        "confirmation",
        "人工确认报告",
        `## 待确认的优化内容\n\n### AgentPrompt 变更\n\n**智能总控Agent**\n- 新增"严禁虚假承诺与口头执行"条款\n- 强制要求话术承诺与工具调用必须同步\n- 新增"信号核对"优先级最高的决策依据\n\n### 知识库变更\n\n**调度场景知识**\n- 更新调度阈值判断规则\n- 新增15分钟关键时间节点说明\n\n### 服务策略变更\n\n**转人工挽回**\n- 优化触发条件判断逻辑\n- 增加情绪识别权重\n\n---\n\n请在右侧「版本对比」中查看详细变更内容，您可以：\n1. 点击「有变化」的组件添加修改意见\n2. 使用「人工优化」功能进行批量调整\n3. 确认无误后点击「同步线上」发布变更`
      )

      setPendingTasks([
        {
          id: "task-4",
          step: "confirmation",
          title: "人工确认优化内容",
          description: "请在右侧版本对比中查看并确认优化内容，添加修改意见后可重新优化，或直接确认同步线上",
          options: ["确认并同步", "添加修改意见重新优化"],
          requiresInput: true,
          inputLabel: "总体修改建议（可选）",
          inputPlaceholder: "请输入您的总体修改建议...",
        },
      ])
      setIsProcessing(false)
    }, 1000)
  }

  const reOptimizeWithModifications = (overallSuggestion?: string) => {
    setIsProcessing(true)
    setCurrentStep("optimization")

    // Use modifications and overall suggestion to re-optimize
    const modCount = modifications.length
    const modSummary = modifications.map(m => `- ${m.component}: ${m.modifiedContent}`).join('\n')

    setTimeout(() => {
      setTimeout(() => {
        addReport(
          "optimization",
          "重新优化执行报告",
          `## 基于修改意见的重新优化\n\n### 收到的修改意见 (${modCount}条)\n\n${modSummary || "无具体组件修改"}\n\n${overallSuggestion ? `### 总体修改建议\n${overallSuggestion}\n\n` : ""}### 已完成的调整\n\n#### 1. AgentPrompt 调整\n- 根据修改意见更新了智能总控Agent的行为准则\n- 优化了决策逻辑的透明度要求\n\n#### 2. 知识库调整\n- 更新了调度场景的阈值判断规则\n- 完善了时间节点的说明文档\n\n#### 3. 服务策略调整\n- 优化了转人工挽回的触发逻辑\n\n### 预期效果\n- 根据修改意见调整后，预计合规性提升 20%\n- 预计决策准确性提升 12%`
        )

        // Clear modifications after re-optimization
        setModifications([])

        setPendingTasks([
          {
            id: "task-3-reopt",
            step: "optimization",
            title: "确认重新优化结果",
            description: "已根据修改意见重新优化，请确认结果",
            options: ["进入人工确认", "继续调整"],
            requiresInput: true,
            inputLabel: "调整需求（可选）",
            inputPlaceholder: "如需继续调整，请描述具体需求...",
          },
        ])
        setIsProcessing(false)
      }, 1500)
    }, 1000)
  }

  const completeWorkflow = () => {
    setCurrentStep("idle")
  }

  const handleChatMessage = (_message: string) => {
    // Handle chat message - could be extended for AI responses
  }

  const handleAddModification = (modification: ModificationItem) => {
    setModifications(prev => [...prev, modification])
  }

  const handleRemoveModification = (id: string) => {
    setModifications(prev => prev.filter(m => m.id !== id))
  }

  const handleUpdateModification = (id: string, modifiedContent: string) => {
    setModifications(prev => prev.map(m => 
      m.id === id ? { ...m, modifiedContent } : m
    ))
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center bg-card/80 backdrop-blur-sm px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-primary shadow-md shadow-primary/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Auto-Agent</h1>
            <p className="text-[11px] text-muted-foreground -mt-0.5">智能客服优化系统</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-4">
        <ResizablePanelGroup direction="horizontal" className="h-full gap-4">
          <ResizablePanel defaultSize={50} minSize={35}>
            <div className="flex h-full flex-col rounded-2xl bg-card shadow-md overflow-hidden border border-border/40">
              {/* Workflow Section */}
              <div className="shrink-0 p-6 bg-gradient-to-b from-card to-muted/10">
                <WorkflowDiagram
                  currentStep={currentStep}
                  isProcessing={isProcessing}
                />
              </div>
              
              {/* Separator */}
              <div className="px-6">
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
              
              {/* Chat Section */}
              <div className="flex-1 overflow-hidden">
                <HumanCollaboration
                  pendingTasks={pendingTasks}
                  onTaskComplete={handleTaskComplete}
                  onChatMessage={handleChatMessage}
                  onStartWorkflow={startWorkflow}
                  currentStep={currentStep}
                  isProcessing={isProcessing}
                  modifications={modifications}
                  onRemoveModification={handleRemoveModification}
                  onUpdateModification={handleUpdateModification}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors rounded-full" />

          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full rounded-2xl bg-card shadow-md overflow-hidden border border-border/40">
              <LogsReportsTabs 
                reports={reports} 
                onAddModification={handleAddModification}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  )
}
