"use client"

import { useState, useRef } from "react"
import { WorkflowDiagram } from "@/components/workflow-diagram"
import { HumanCollaboration } from "@/components/human-collaboration"
import { LogsReportsTabs } from "@/components/logs-reports-tabs"
import { Sidebar } from "@/components/sidebar"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

export type WorkflowStep = "analysis" | "suggestions" | "optimization" | "confirmation" | "manual" | "idle"

export type OptSubStep =
  | "baseline"      // 基线分数生成
  | "execute"       // 执行优化
  | "evaluate"      // 优化效果评估
  | "check"         // 优化效果是否达标
  | "report"        // 生成优化报告
  | "idle"

export interface OptSubStepState {
  subStep: OptSubStep
  round: number        // 当前轮次（execute/evaluate/check 会循环）
  passed: boolean      // 本次 check 是否达标
}

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
  reportUrl?: string
  isCompletionCard?: boolean
}

export type OptimizationMethod = "daily-report" | "badcase"

export interface OptimizationParams {
  method: OptimizationMethod
  date?: string
  businessScenario?: string   // scenarioId
  scenarioName?: string       // scenarioName for display
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
  const [optSubStepState, setOptSubStepState] = useState<OptSubStepState>({ subStep: "idle", round: 0, passed: false })
  const [showManualStep, setShowManualStep] = useState(false)
  const [showSyncStep, setShowSyncStep] = useState(false)
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
    setShowManualStep(false)
    setShowSyncStep(false)

    // 新建任务条目，名称格式：业务场景 · 日期
    const taskDate = params.date
      ? params.date
      : new Date().toISOString().slice(0, 10)
    const taskScene =
      params.method === "daily-report"
        ? params.scenarioName || params.businessScenario || "全部场景"
        : `BadCase优化`
    const newTaskId = `task-${Date.now()}`
    const newTask = { id: newTaskId, name: `${taskScene} · ${taskDate}` }
    setTasks((prev) => [newTask, ...prev])
    setCurrentTaskId(newTaskId)

    setTimeout(() => {
      setTimeout(() => {
        const sceneName = params.scenarioName || params.businessScenario || "全部场景"
        const analysisContent = params.method === "daily-report"
          ? `## 问题分析结果\n\n| 参数 | 值 |\n|---|---|\n| 优化方式 | 基于日报优化 |\n| 日期 | ${params.date || "未指定"} |\n| 业务场景 | ${sceneName} |\n\n### 场景聚类分析\n\n本数据集共 **470条会话**，聚类覆盖率 **60%**（282/470）。核心聚类如下：\n\n| 聚类名称 | 占比 | 转人工率 | 智能解决率 |\n|---|---|---|---|\n| 反馈-骑手配送相关问题 | 17.73%（50条） | 54.00% | 0% |\n| 咨询-客户提及相关问题 | 15.96%（45条） | 0% | 0% |\n| 客户-提及当前问题 | 9.93%（28条） | 0% | 0% |\n| 订单相关-联系问题咨询 | 9.93%（28条） | 46.43% | 0% |\n| 解析失败 | 10.64%（30条） | 3.33% | 0% |\n| 反馈-无骑手接单问题 | 6.74%（19条） | 36.84% | 0% |\n| 咨询-客户反馈相关问题 | 6.74%（19条） | 0% | 0% |\n| 咨询-问题提及未明确内容 | 7.09%（20条） | 0% | 0% |\n\n### 归因分析\n\n归因覆盖率 **0.85%**（4/470），主要归因如下：\n\n1. **动作执行错误** - 3个Case（75%）\n   - **动作缺失（2个）**：模型在话术中承诺"已为您扩大了调度范围"，但实际执行过程中并未调用对应业务工具。"虚假承诺"导致后续对话建立在错误状态之上\n   - **负向约束违反（1个）**：用户连续两轮明确提出"转人工"诉求，模型完全忽略，机械重复"话术挽留"策略，违反SOP基本合规原则\n\n2. **知识理解错误** - 1个Case（25%）\n   - **信号识别失败（1个）**：未识别关键业务信号（\`{无骑手接单时长}\`、\`{商家主营品类}\`、\`{是否预定订单}\`），脱离SOP中"15分钟"刚性时间阈值，仅凭主观判断选择"扩大调度"而非"加急调度"`
          : `## 问题分析结果\n\n**优化方式**: 基于具体BadCase优化\n**SessionId集合**: ${params.sessionIds || "2014954720184365123, 2015044458790256656, 2014907203220213763, 2014997182214635566"}\n${params.manualAnalysis ? `**人工分析**: ${params.manualAnalysis}\n\n` : "\n"}**基线得分**: 62.5 → **当前最佳得分**: 92.5（+30.0分，超越目标90.0分）\n\n### 主要归因分析\n\n1. **执行-动作未执行/虚假承诺** - 3个Case\n   - Agent 在话术中承诺"已扩大调度范围"，但未在 \`final_solution_actions\` 中调用对应的执行工具\n   - 导致口头承诺与实际动作脱节，违反"红线-虚假承诺"安全准则\n\n2. **感知-业务信号缺失** - 3个Case\n   - Agent 忽略了 \`{无骑手接单时长}\`、\`{是否到店自取订单}\` 等关键业务信号\n   - 未能根据 SOP 要求的 15 分钟阈值准确区分"扩大调度"与"加急调度"\n\n3. **交互-规则透明化不足** - 3个Case\n   - 回复中缺乏对业务规则（如等待时长阈值）的解释\n   - 导致商家对处理逻辑缺乏预期\n\n### 典型BadCase示例\n\n**Case 1** (sessionId: 2014954720184365123)\n- **业务场景**: 医疗器械店 · 无骑手接单 · 未超过15分钟\n- **基线回复**: "我已经为您扩大了调度范围…" → 得分: **0分**（触发虚假承诺红线）\n- **问题**: 声称已执行但未调用任何工具\n\n**Case 2** (sessionId: 2015044458790256656)\n- **基线得分**: 80分 → **优化后**: 100分（+20分）\n- **问题**: 未检查关键业务信号，未调用执行工具`

        addReport(
          "analysis",
          "问题分析报告",
          analysisContent
        )

        setPendingTasks([
          {
            id: "task-1",
            step: "analysis",
            title: "确认分析结果",
            description: "请确认以上分析结果是否准确，确认后将开始生成优化建议。如需补充归因分析，请填写修改意见后点击「补充归因分析」",
            options: ["确认分析结果", "补充归因分析"],
            requiresInput: true,
            inputLabel: "修改意见",
            inputPlaceholder: "请输入补充的归因分析意见（点击「补充归因分析」前必填）...",
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
    } else if (task.step === "analysis" && result === "补充归因分析") {
      reAnalysisWithFeedback(additionalInput || "")
    } else if (task.step === "suggestions" && result === "确认优化建议") {
      proceedToOptimization()
    } else if (task.step === "suggestions" && result === "补充优化方向") {
      reGenerateSuggestionsWithFeedback(additionalInput || "")
    } else if (task.step === "optimization") {
      if (result === "同步线上") {
        showSyncConfirmation()
      } else if (result === "人工优化") {
        showManualOptimizationForm()
      } else if (result === "结束流程") {
        completeWorkflow(false)
      } else {
        proceedToConfirmation()
      }
    } else if (task.step === "manual") {
      if (result === "开始人工优化") {
        reOptimizeWithModifications(additionalInput)
      } else if (result === "同步线上") {
        showSyncConfirmation()
      } else if (result === "人工优化") {
        showManualOptimizationForm()
      } else if (result === "结束流程") {
        completeWorkflow(false)
      }
    } else if (task.step === "confirmation") {
      if (result === "确认同步线上") {
        completeWorkflow()
      } else if (result === "取消") {
        setShowSyncStep(false)
        setCurrentStep("optimization")
        setPendingTasks([
          {
            id: "task-3-back-" + Date.now(),
            step: "optimization",
            title: "智能优化已完成",
            description: "请在右侧「版本对比」中查看优化结果，选择下一步操作",
            options: ["同步线上", "人工优化", "结束流程"],
          },
        ])
      } else if (result === "重新优化") {
        reOptimizeWithModifications(additionalInput)
      } else if (result === "确认完成") {
        completeWorkflow()
      }
    }
  }

  const reAnalysisWithFeedback = (feedback: string) => {
    setIsProcessing(true)
    setCurrentStep("analysis")

    setTimeout(() => {
      addReport(
        "analysis",
        "问题分析报告（补充归因）",
        `## 问题分析结果（补充归因）\n\n> **补充意见**: ${feedback}\n\n### 聚类覆盖率与问题总览\n\n本数据集共 **470条会话**，聚类覆盖率 **60%**（282/470）。根据您的补充意见，对以下归因进行了重新分析：\n\n| 聚类名称 | 占比 | 转人工率 | 归因状态 |\n|---|---|---|---|\n| 反馈-骑手配送相关问题 | 17.73%（50条） | 54.00% | 已补充归因 |\n| 咨询-客户提及相关问题 | 15.96%（45条） | 0% | 已补充归因 |\n| 订单相关-联系问题咨询 | 9.93%（28条） | 46.43% | 已补充归因 |\n\n### 补充归因分析\n\n基于您的修改意见，新增以下归因维度：\n\n**原有归因**（4个Case）：\n1. 动作执行错误 - 3个Case（75%）：动作缺失、负向约束违反\n2. 知识理解错误 - 1个Case（25%）：信号识别失败\n\n**补充归因**（根据您的意见）：\n- ${feedback}\n\n### 修订后的优化方向\n\n综合原始归因和您的补充意见，调整后的优化方向如下：\n\n1. **补充动作完整性要求**（最高优先级）：强化ReAct框架执行一致性约束，确保话术承诺与工具调用严格同步\n2. **强化负向约束说明**：明确转人工红线，设定挽留阈值（最多一轮挽留）\n3. **增强信号识别指引**：强化感知阶段约束，优先核对关键业务参数（\`{无骑手接单时长}\`等）\n4. **用户补充方向**：${feedback.substring(0, 80)}${feedback.length > 80 ? "..." : ""}`
      )

      setPendingTasks([
        {
          id: "task-1-re-" + Date.now(),
          step: "analysis",
          title: "确认分析结果",
          description: "已根据您的补充意见完成归因补充分析，请确认后继续生成优化建议",
          options: ["确认分析结果", "补充归因分析"],
          requiresInput: true,
          inputLabel: "修改意见",
          inputPlaceholder: "如需继续补充，请填写修改意见后点击「补充归因分析」...",
        },
      ])
      setIsProcessing(false)
    }, 2000)
  }

  const reGenerateSuggestionsWithFeedback = (feedback: string) => {
    setIsProcessing(true)
    setCurrentStep("suggestions")

    setTimeout(() => {
      addReport(
        "suggestions",
        "优化建议报告（补充方向）",
        `## 优化建议（补充优化方向）\n\n> **补充优化方向**: ${feedback}\n\n基于您的补充方向，结合原始归因分析，重新整理了以下优化建议：\n\n---\n\n### 1. 用户补充方向\n\n${feedback}\n\n---\n\n### 2. 补充动作完整性要求（保留原有建议）\n\n**优化内容**:\n1. 在Prompt的ReAct框架中明确要求，所有在回复（respond）中声称的业务动作必须以工具调用结果为前提，严禁在未成功调用工具的情况下输出承诺性话术\n2. 设定挽留阈值（连续2次转人工即视为挽留失败），强制模型切换至转人工执行路径\n\n---\n\n### 3. 增强信号识别指引（保留原有建议）\n\n**优化内容**:\n1. 处理时效敏感场景时，必须优先检索关键参数（\`{无骑手接单时长}\`、\`{商家主营品类}\`等），严禁在关键参数缺失时进行主观臆断\n2. 将"15分钟"等关键业务阈值进行结构化标注，要求模型在输出策略前比对信号值与SOP阈值\n\n---\n\n### 预期优化效果\n| 指标 | 当前 | 预期 |\n|---|---|---|\n| 动作缺失问题 | 2/4 Case | 降至 0 |\n| 负向约束违反 | 1/4 Case | 降至 0 |\n| 信号识别失败 | 1/4 Case | 降至 0 |\n| 转人工率（高转人工聚类） | 54% | 目标降至 30% 以下 |`
      )

      setPendingTasks([
        {
          id: "task-2-re-" + Date.now(),
          step: "suggestions",
          title: "确认优化建议",
          description: "已根据您的自定义方向重新生成优化建议，请确认后继续执行智能优化",
          options: ["确认优化建议", "补充优化方向"],
          requiresInput: true,
          inputLabel: "补充优化方向",
          inputPlaceholder: "如需继续调整，请填写后点击「补充优化方向」...",
        },
      ])
      setIsProcessing(false)
    }, 2000)
  }

  const proceedToSuggestions = () => {
    setIsProcessing(true)
    setCurrentStep("suggestions")

    setTimeout(() => {
      setTimeout(() => {
        addReport(
          "suggestions",
          "优化建议报告",
          `## 优化建议\n\n基于本次Case分析，挖掘出 **3个核心优化方向**，建议优先处理**动作执行错误**类问题（归因占比75%）。\n\n---\n\n### 1. 补充动作完整性要求（Prompt优化 · 最高优先级）\n\n**问题来源**: 动作缺失 — 2个Case（sessionId: 2010166943210913792, 2010315806433390656）\n\n**优化内容**:\n1. **强化执行一致性约束**：在Prompt的ReAct框架中明确要求，所有在回复（respond）中声称的业务动作（如扩大调度、改派等）必须以工具调用结果为前提，严禁在未成功调用工具的情况下输出承诺性话术\n2. **优化多轮转人工逻辑**：在Prompt中增加"用户坚持度"识别指引，设定挽留阈值（如**连续2次转人工即视为挽留失败**），强制模型在用户多次表达相同诉求时切换至转人工执行路径\n3. **引入话术多样性约束**：针对挽留场景，要求模型在多轮对话中必须变换安抚角度，避免使用高度相似的句式\n\n---\n\n### 2. 强化负向约束说明（Prompt优化）\n\n**问题来源**: 负向约束违反 — 1个Case（sessionId: 2010301604859387981）\n\n**优化内容**:\n1. 在Prompt负向约束模块中明确增加"转人工处理红线"：规定当用户明确提出"转人工"或表现出强烈抗拒AI沟通时，**必须立即执行转人工逻辑**，禁止连续两次及以上使用挽留话术\n2. 设定挽留策略的触发阈值和退出机制：**最多仅允许进行一轮挽留，若用户坚持则必须流转**\n3. 增强多轮状态感知：要求模型在决策前评估用户意愿坚定程度，若用户重复同一诉求，应判定为当前AI方案失效，必须切换处理路径\n\n---\n\n### 3. 增强信号识别指引（Prompt优化）\n\n**问题来源**: 信号识别失败 — 1个Case（sessionId: 2010030481639624749）\n\n**优化内容**:\n1. **强化感知阶段约束**：在Prompt中明确要求，处理催接单、配送慢等时效敏感场景时，必须优先检索并提取订单信号中的关键参数（\`{无骑手接单时长}\`、\`{商家主营品类}\`、\`{是否预定订单}\`等），**严禁在关键参数缺失时进行主观臆断**\n2. **优化SOP决策逻辑**：将"15分钟"等关键业务阈值进行结构化标注，要求模型在输出策略前必须比对当前信号值与SOP阈值的关系\n3. **增加工具调用指引**：若当前上下文缺失关键参数，应引导模型先通过调用查询类工具获取实时订单状态，而非直接给出解决方案\n\n---\n\n### 预期优化效果\n| 指标 | 当前 | 预期 |\n|---|---|---|\n| 动作缺失问题 | 2/4 Case | 降至 0 |\n| 负向约束违反 | 1/4 Case | 降至 0 |\n| 信号识别失败 | 1/4 Case | 降至 0 |\n| 转人工率（高转人工聚类） | 54% | 目标降至 30% 以下 |`
        )

        setPendingTasks([
          {
            id: "task-2",
            step: "suggestions",
            title: "确认优化建议",
            description: "请确认以上优化建议是否合适，确认后将开始执行智能优化。如需调整优化方向，请填写自定义意见后点击「自定义优化方案」",
            options: ["确认优化建议", "补充优化方向"],
            requiresInput: true,
            inputLabel: "补充优化方向",
            inputPlaceholder: "请输入您的补充优化方向（点击「补充优化方向」前必填）...",
          },
        ])
        setIsProcessing(false)
      }, 1500)
    }, 1000)
  }

  const proceedToOptimization = () => {
    setIsProcessing(true)
    setCurrentStep("optimization")
    setOptSubStepState({ subStep: "idle", round: 0, passed: false })

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

    const run = async () => {
      // 1. 基线分数生成
      setOptSubStepState({ subStep: "baseline", round: 0, passed: false })
      await delay(1200)

      // 第1轮：执行优化 → 评估 → 未达标 → 循环
      setOptSubStepState({ subStep: "execute", round: 1, passed: false })
      await delay(1200)
      setOptSubStepState({ subStep: "evaluate", round: 1, passed: false })
      await delay(1200)
      setOptSubStepState({ subStep: "check", round: 1, passed: false })
      await delay(1000)

      // 第2轮：执行优化 → 评估 → 达标
      setOptSubStepState({ subStep: "execute", round: 2, passed: false })
      await delay(1200)
      setOptSubStepState({ subStep: "evaluate", round: 2, passed: false })
      await delay(1200)
      setOptSubStepState({ subStep: "check", round: 2, passed: true })
      await delay(1000)

      // 5. 生成优化报告
      setOptSubStepState({ subStep: "report", round: 2, passed: true })
      await delay(1200)

      addReport("optimization",
        "优化执行报告",
        `## 优化执行结果\n\n### 已完成的优化（共2轮）\n\n#### 第1轮优化 (v1) — 2026-02-05 17:39:33\n\n**得分**: 62.5 → **67.5**（+5.0分）\n\n**关键改动**:\n- **智能总控Agent - 2.1 执行铁律**: 新增"严禁虚假承诺与口头执行"条款，强制要求话术承诺与工具调用必须同步\n- **智能总控Agent - 4.2 业务决策**: 新增"信号核对"优先级，强调必须核对时间阈值等信号，并要求话术体现规则透明化\n- **智能总控Agent - 4.5.1 工具分类**: 明确调度类工具必须按照 SOP 成对调用（执行工具+智能跟单）\n\n**Case结果**: 改善 2个 | 持平 1个 | 下降 1个\n\n---\n\n#### 第2轮优化 (v2 · 最佳版本) — 2026-02-05 17:43:40\n\n**得分**: 67.5 → **92.5**（+25.0分，**超越目标90.0分**）✅\n\n**关键改动**:\n- **强化执行铁律**: 强制要求话术中的操作承诺必须与 \`final_solution_actions\` 工具调用严格同步\n- **提升信号感知优先级**: 将业务信号核对（接单时长、订单类型）设为决策最高优先级\n- **规范工具调用逻辑**: 调度类工具必须按照 SOP 要求成对调用\n\n**Case结果**: 改善 3个 | 持平 1个 | 下降 0个 🎉\n\n---\n\n### 整体优化效果\n\n| 指标 | 基线 | 最佳版本(v2) |\n|------|------|------|\n| 平均得分 | 62.5 | **92.5** |\n| 总提升 | — | **+30.0分** |\n| 目标得分 | 90.0 | ✅ 已超越 |\n| 分数分布(优秀≥90) | 0个 | **1个** |\n| 分数分布(良好70-89) | 1个 | **3个** |\n| 分数分布(待改善<70) | 3个 | **0个** |\n\n### 下一步建议\n- 补充复杂边界 Case 进行回归测试\n- 验证 SOP 决策路径在极端场景下的稳定性\n- 监控线上效果 7 天后复评`
      )

      setPendingTasks([
        {
          id: "task-3",
          step: "optimization",
          title: "智能优化已完成",
          description: "请在右侧「版本对比」中查看优化结果，选择下一步操作",
          options: ["同步线上", "人工优化", "结束流程"],
        },
      ])
      // 子流程全部完成，保持展示
      setOptSubStepState({ subStep: "report", round: 2, passed: true })
      setIsProcessing(false)
    }

    run()
  }

  const showManualOptimizationForm = () => {
    setShowManualStep(true)
    setCurrentStep("manual")
    setPendingTasks([
      {
        id: "task-manual-form-" + Date.now(),
        step: "manual",
        title: "填写人工优化意见",
        description: "请在右侧「版本对比」中选中需要修改的内容并添加修改意见，填写完成后点击「开始人工优化」",
        options: ["开始人工优化"],
        requiresInput: true,
        inputLabel: "总体修改建议",
        inputPlaceholder: "请输入您的总体修改建议（可在右侧版本对比中选中文字添加具体意见）...",
      },
    ])
  }

  const proceedToConfirmation = () => {
    setIsProcessing(true)
    setCurrentStep("confirmation")

    setTimeout(() => {
      addReport(
        "confirmation",
        "人工确认报告",
        `## 待确认的优化内容（最佳版本 v2）\n\n### AgentPrompt 变更\n\n**智能总控Agent — 2.1 执行铁律**\n\n新增以下条款：\n> *严禁虚假承诺与口头执行：严禁在未实际调用工具的情况下向用户承诺任何系统操作（如扩大调度、加急、转单等）。若回复中包含"已为您执行XX"或"已为您处理"，则必须在 \`final_solution_actions\` 中同步输出对应工具，确保承诺与执行一致。*\n\n**智能总控Agent — 4.2 步骤2：业务决策**\n\n新增"信号核对（优先级最高）"决策依据：\n> *决策前必须严格核对 \`system_signal\` 中的关键阈值（如 \`{无骑手接单时长}\` 是否达15分钟、\`{是否到店自取订单}\`、\`{商家主营品类}\` 等），确保决策符合 SOP 逻辑，并在话术中体现规则透明化。*\n\n**智能总控Agent — 4.5.1 工具分类**\n\n新增调度工具成对调用要求：\n> *调度类工具必须按照 SOP 成对调用（\`执行工具-扩大调度范围\` + \`智能跟单-扩大调度范围\`），缺一不可。*\n\n---\n\n### 优化效果验证\n\n| Case | Session ID | 基线得分 | 优化得分 | 提升 |\n|------|-----------|---------|---------|------|\n| Case 1 | 2014954720184365123 | 0 | 90 | **+90** |\n| Case 2 | 2015044458790256656 | 80 | 100 | **+20** |\n| Case 3 | 2014907203220213763 | 80 | 90 | **+10** |\n| Case 4 | 2014997182214635566 | 90 | 90 | 持平 |\n\n**综合得分**: 62.5 → **92.5**（+30.0分）✅ 已超越目标90.0分\n\n---\n\n请在右侧「版本对比」中查看详细变更内容，您可以：\n1. 点击「有变化」的组件添加修改意见\n2. 确认无误后点击「同步线上」发布 v2 版本`
      )

      setPendingTasks([
        {
          id: "task-4-" + Date.now(),
          step: "confirmation",
          title: "人工确认优化内容",
          description: "请在右侧「版本对比」中查看变更详情，点击「有变化」的组件添加修改意见",
          options: ["确认完成", "重新优化"],
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
    setCurrentStep("manual")

    const modCount = modifications.length
    const modSummary = modifications.map(m => `- **${m.component}**: ${m.modifiedContent}`).join('\n')

    setTimeout(() => {
      setTimeout(() => {
        // 先生成人工优化对比报告
        addReport(
          "optimization",
          "人工优化执行报告",
          `## 人工优化执行结果\n\n### 修改意见应用（共 ${modCount} 条）\n\n${modSummary || "无具体组件修改意见"}\n${overallSuggestion ? `\n**总体修改建议**: ${overallSuggestion}\n` : ""}\n---\n\n#### 人工优化版本 (v3) — ${new Date().toLocaleString('zh-CN')}\n\n**得分**: 92.5 → **95.0**（+2.5分）✅\n\n**关键改动**:\n- **智能总控Agent — 执行铁律**: 强化：明确列举禁止用语清单，触发条件描述更精确\n- **智能总控Agent — 业务决策**: 补充商家主营品类优先级，按场景分类细化规则透明化描述\n- **智能总控Agent — 工具调用**: 扩大调度场景增加边界条件说明\n\n**Case结果**: 改善 2个 | 持平 2个 | 下降 0个 🎉\n\n---\n\n### 整体优化效果\n\n| 指标 | 基线 | 智能优化(v2) | 人工优化(v3) |\n|------|------|------------|------------|\n| 平均得分 | 62.5 | 92.5 | **95.0** |\n| 总提升 | — | +30.0分 | **+32.5分** |\n| 目标得分 | 90.0 | ✅ 已超越 | ✅ 已超越 |\n\n### Case评分对比\n\n| Case | Session ID | 基线 | v2(智能) | v3(人工) | 总变化 |\n|------|-----------|------|---------|---------|------|\n| Case 1 | 2010166943210913792 | 0 | 90 | **95** | +95 |\n| Case 2 | 2010315806433390656 | 80 | 100 | **100** | +20 |\n| Case 3 | 2010301604859387981 | 80 | 90 | **95** | +15 |\n| Case 4 | 2010030481639624749 | 90 | 90 | **90** | 持平 |`
        )

        // 清空修改意见
        setModifications([])

        setPendingTasks([
          {
            id: "task-3-reopt-" + Date.now(),
            step: "manual",
            title: "人工优化已完成",
            description: "已根据修改意见完成人工优化，请查看上方对比报告并选择下一步操作",
            options: ["同步线上", "人工优化", "结束流程"],
          },
        ])
        setIsProcessing(false)
      }, 1500)
    }, 1000)
  }

  const showSyncConfirmation = () => {
    setShowSyncStep(true)
    setCurrentStep("confirmation")
    setPendingTasks([
      {
        id: "task-sync-" + Date.now(),
        step: "confirmation",
        title: "同步线上确认",
        description: "即将同步至生产环境的版本：v2（最佳版本，得分92.5），更新时间：" + new Date().toLocaleString('zh-CN'),
        options: ["确认同步线上", "取消"],
      },
    ])
  }

  const completeWorkflow = (isSynced = true) => {
    if (isSynced) {
      addReport(
        "optimization",
        "同步完成",
        `## 同步完成\n\n本次优化已成功同步到线上环境。\n\n### 同步详情\n\n- **任务名称**: Prompt优化任务-4469\n- **版本号**: v2（最佳版本）\n- **同步时间**: ${new Date().toLocaleString('zh-CN')}\n- **得分提升**: 62.5 → **92.5**（+30.0分）✅ 超越目标90.0分\n- **变更内容**: 智能总控Agent执行铁律、业务决策信号核对、工具调用规范\n\n### 主要变更摘要\n\n1. 新增"严禁虚假承诺与口头执行"条款\n2. 决策环节"信号核对"设为最高优先级\n3. 调度类工具强制成对调用（执行工具 + 智能跟单）`
      )
    }

    // 清空待处理任务，保持流程图全部完成状态，不允许回退
    setPendingTasks([{
      id: "task-completion-" + Date.now(),
      step: "confirmation",
      title: "优化流程已完成",
      description: isSynced ? "优化结果已同步至线上环境，可前往优化任务报告查看完整详情。" : "本次优化流程已结束，可前往优化任务报告查看完整详情。",
      isCompletionCard: true,
      reportUrl: `/report`,
    }])
    setCurrentStep("confirmation")
  }

  const handleChatMessage = (_message: string) => {
    // Handle chat message - could be extended for AI responses
  }

  const handleStepClick = (stepId: WorkflowStep) => {
    // Only allow clicking on completed steps to view their reports
    const stepOrder = ["analysis", "suggestions", "optimization", "confirmation"]
    const currentIndex = stepOrder.indexOf(currentStep)
    const clickedIndex = stepOrder.indexOf(stepId)

    // Allow viewing completed steps or current step
    if (clickedIndex <= currentIndex || currentStep === "idle") {
      // Could expand to show step details/reports in a modal or scroll to that report
      // For now, we just highlight that step was clicked
    }
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

  const [activeMenu, setActiveMenu] = useState<string>("")
  const [tasks, setTasks] = useState([
    { id: "task-1", name: "催接单场景 · 2026-02-05" },
    { id: "task-2", name: "退款场景 · 2026-01-20" },
  ])
  const [currentTaskId, setCurrentTaskId] = useState<string | null>("task-1")

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
        tasks={tasks}
        currentTaskId={currentTaskId}
        onCreateNew={() => {
          setCurrentTaskId(null)
          setCurrentStep("idle")
          setReports([])
          setModifications([])
          setPendingTasks([])
          setOptSubStepState({ subStep: "idle", round: 0, passed: false })
          setShowManualStep(false)
          setShowSyncStep(false)
        }}
        onSelectTask={setCurrentTaskId}
        onDeleteTask={(id) => {
          setTasks((prev) => prev.filter((t) => t.id !== id))
          if (currentTaskId === id) setCurrentTaskId(null)
        }}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <main className="flex-1 overflow-hidden p-4">
          <ResizablePanelGroup direction="horizontal" className="h-full gap-4">
            <ResizablePanel defaultSize={35} minSize={28}>
              <div className="flex h-full flex-col rounded-2xl bg-card shadow-md overflow-hidden border border-border/40">
                {/* Workflow Section */}
                <div className="shrink-0 p-6 bg-gradient-to-b from-card to-muted/10">
                  <WorkflowDiagram
                    currentStep={currentStep}
                    isProcessing={isProcessing}
                    onStepClick={handleStepClick}
                    showConfirmationStep={showSyncStep}
                    showManualStep={showManualStep}
                    showSyncStep={showSyncStep}
                    isCompleted={currentStep === "confirmation" && pendingTasks.length === 0}
                    optSubStepState={optSubStepState}
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

            <ResizablePanel defaultSize={65} minSize={40}>
              <div className="h-full rounded-2xl bg-card shadow-md overflow-hidden border border-border/40">
                <LogsReportsTabs
                  reports={reports}
                  onAddModification={handleAddModification}
                  modifications={modifications}
                  onRemoveModification={handleRemoveModification}
                  onUpdateModification={handleUpdateModification}
                  onStartManualOptimization={(overallSuggestion) => {
                    reOptimizeWithModifications(overallSuggestion)
                  }}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      </div>
    </div>
  )
}
