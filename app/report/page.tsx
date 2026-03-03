"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  REPORT_META,
  BEST_PROMPT_DIFF,
  SCORE_TREND,
  PROMPT_TABS,
  IMPROVED_CASES,
  UNCHANGED_CASES,
  BEST_DIST,
  BASE_DIST,
} from "@/lib/report-data"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  TrendingUp,
  Search,
  Lightbulb,
  GitCompare,
  BarChart3,
  CheckCircle2,
  Minus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Copy,
  CheckCheck,
} from "lucide-react"

// ---------- types ----------
type PromptDiffSegment =
  | { type: "single"; content: string }
  | { type: "diff"; search: string; replace: string }

// ---------- build prompt doc tabs ----------
function buildPromptDocTabs() {
  const DIFF_RE = /<<<<<<< SEARCH\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> REPLACE/g

  function parseBlocks(diff: string): Array<{ search: string; replace: string }> {
    const blocks: Array<{ search: string; replace: string }> = []
    let m: RegExpExecArray | null
    const re = new RegExp(DIFF_RE.source, "g")
    while ((m = re.exec(diff)) !== null) {
      blocks.push({ search: (m[1] ?? "").trimEnd(), replace: (m[2] ?? "").trimStart() })
    }
    return blocks
  }

  function norm(s: string) { return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n") }

  function buildSegments(baseline: string, diff: string): PromptDiffSegment[] {
    const blocks = parseBlocks(diff)
    if (blocks.length === 0) return [{ type: "single", content: baseline }]
    const segments: PromptDiffSegment[] = []
    let rest = norm(baseline)
    for (const { search, replace } of blocks) {
      const searchNorm = norm(search).trimEnd()
      const idx = rest.indexOf(searchNorm)
      if (idx >= 0) {
        if (rest.slice(0, idx)) segments.push({ type: "single", content: rest.slice(0, idx) })
        segments.push({ type: "diff", search, replace })
        rest = rest.slice(idx + searchNorm.length)
      }
    }
    if (rest) segments.push({ type: "single", content: rest })
    return segments
  }

  return PROMPT_TABS.map(tab => {
    let fragments: PromptDiffSegment[]
    if (tab.hasChange) {
      const diffBlocks = parseBlocks(BEST_PROMPT_DIFF)
      const baseNorm = norm(tab.baseContent)
      let hasDiff = false
      for (const { search } of diffBlocks) {
        if (baseNorm.includes(norm(search).trimEnd())) { hasDiff = true; break }
      }
      if (hasDiff) {
        fragments = buildSegments(tab.baseContent, BEST_PROMPT_DIFF)
      } else {
        fragments = [{ type: "diff", search: tab.baseContent, replace: tab.bestContent }]
      }
    } else {
      fragments = [{ type: "single", content: tab.bestContent }]
    }
    return { key: tab.key, docName: tab.docName, tagName: tab.tagName, hasChange: tab.hasChange, fragments }
  })
}

const docTabs = buildPromptDocTabs()

// ---------- markdown components ----------
const mdComponents = {
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs border-collapse border border-border" {...props} />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="border border-border bg-muted/60 px-2 py-1 text-left font-medium" {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border border-border px-2 py-1" {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="overflow-x-auto rounded bg-muted/40 p-3 text-xs" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className="rounded bg-muted/60 px-1 py-0.5 text-xs font-mono break-all" {...props} />
  ),
}

// ---------- DiffBlock ----------
function DiffBlock({ search, replace }: { search: string; replace: string }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden mb-4">
      <div className="grid grid-cols-2 text-xs font-semibold border-b border-border">
        <div className="px-4 py-2 bg-red-50 text-red-600 border-r border-border">SEARCH（原内容）</div>
        <div className="px-4 py-2 bg-green-50 text-green-600">REPLACE（新内容）</div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border max-h-80 overflow-hidden">
        <div className="overflow-y-auto p-4 bg-red-50/40 text-xs text-red-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{search}</ReactMarkdown>
        </div>
        <div className="overflow-y-auto p-4 bg-green-50/40 text-xs text-green-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{replace}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

// ---------- CaseCard ----------
function CaseCard({ c, type }: { c: typeof IMPROVED_CASES[0]; type: "improved" | "unchanged" }) {
  const [open, setOpen] = useState(false)
  const scoreChange = parseInt(c.optimizedScore) - parseInt(c.baselineScore)
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn(
            "text-[10px] rounded-full",
            type === "improved" ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-muted-foreground/30 text-muted-foreground"
          )}>
            {type === "improved" ? `+${scoreChange}分` : "持平"}
          </Badge>
          <span className="text-xs font-mono text-muted-foreground">{c.sessionId}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded font-bold">{c.baselineScore}</span>
            <span className="text-muted-foreground">→</span>
            <span className={cn("px-2 py-0.5 rounded font-bold", type === "improved" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{c.optimizedScore}</span>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Response comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">基线 {c.baselineScore}分</span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{c.baselineResponse}</p>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">优化后 {c.optimizedScore}分</span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{c.optimizedResponse}</p>
            </div>
          </div>
          {/* Score CoT */}
          {(c.baselineScoreCot || c.optimizedScoreCot) && (
            <div className="grid grid-cols-2 gap-3">
              {c.baselineScoreCot && (
                <div className="rounded-lg bg-muted/20 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">基线评分说明</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{c.baselineScoreCot}</p>
                </div>
              )}
              {c.optimizedScoreCot && (
                <div className="rounded-lg bg-primary/5 p-3">
                  <p className="text-[10px] font-semibold text-primary/70 mb-1">优化后评分说明</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{c.optimizedScoreCot}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Section ----------
function Section({ id, icon, title, badge, children }: {
  id: string
  icon: React.ReactNode
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  )
}

// ---------- analysis data (from real API) ----------
const CLUSTER_DATA = [
  { name: "反馈-骑手配送相关问题", ratio: "17.73%", count: 50, transferRate: "54.00%" },
  { name: "咨询-客户提及相关问题", ratio: "15.96%", count: 45, transferRate: "0%" },
  { name: "客户-提及当前问题", ratio: "9.93%", count: 28, transferRate: "0%" },
  { name: "订单相关-联系问题咨询", ratio: "9.93%", count: 28, transferRate: "46.43%" },
  { name: "解析失败", ratio: "10.64%", count: 30, transferRate: "3.33%" },
  { name: "反馈-无骑手接单问题", ratio: "6.74%", count: 19, transferRate: "36.84%" },
  { name: "咨询-客户反馈相关问题", ratio: "6.74%", count: 19, transferRate: "0%" },
  { name: "咨询-问题提及未明确内容", ratio: "7.09%", count: 20, transferRate: "0%" },
]

const ATTRIBUTION_DATA = [
  {
    name: "动作执行错误",
    rate: "75%",
    count: 3,
    children: [
      { name: "动作缺失（2个）", desc: `模型在话术中承诺"已为您扩大了调度范围"，但实际执行过程中并未调用对应业务工具。"虚假承诺"导致后续对话建立在错误状态之上` },
      { name: "负向约束违反（1个）", desc: `用户连续两轮明确提出"转人工"诉求，模型完全忽略，机械重复"话术挽留"策略，违反SOP基本合规原则` },
    ],
  },
  {
    name: "知识理解错误",
    rate: "25%",
    count: 1,
    children: [
      { name: "信号识别失败（1个）", desc: `未识别关键业务信号（{无骑手接单时长}、{商家主营品类}、{是否预定订单}），脱离SOP中"15分钟"刚性时间阈值，仅凭主观判断选择"扩大调度"而非"加急调度"` },
    ],
  },
]

const SUGGESTION_DATA = [
  {
    title: "补充动作完整性要求",
    priority: "最高优先级",
    items: [
      "在Prompt的ReAct框架中明确要求，所有在回复中声��的业务动作必须以工具调用结果为前提，严禁在未成功调用工具的情况下输出承诺性话术",
      "设定挽留阈值：连续2次转人工即视为挽留失败，强制切换至转人工执行路径",
      "引入话术多样性约束：多轮对话中必须变换安抚角度，避免高度相似句式",
    ],
    cases: ["2010166943210913792", "2010315806433390656"],
  },
  {
    title: "强化负向约束说明",
    priority: "高优先级",
    items: [
      `在Prompt负向约束模块中明确增加"转人工处理红线"：当用户明确提出"转人工"时，必须立即执行，禁止连续两次以上使用挽留话术`,
      "设定挽留策略退出机制：最多仅允许进行一轮挽留，若用户坚持则必须流转",
      "增强多轮状态感知：若用户重复同一诉求，判定为当前方案失效，必须切换处理路径",
    ],
    cases: ["2010301604859387981"],
  },
  {
    title: "增强信号识别指引",
    priority: "中优先级",
    items: [
      "处理时效敏感场景时，必须优先检索关键参数（{无骑手接单时长}、{商家主营品类}、{是否预定订单}），严禁在参数缺失时主观臆断",
      `将"15分钟"等关键业务阈值进行结构化标注，要求模型在输出策略前比对信号值与SOP阈值`,
      "若当前上下文缺失关键参数，应先通过查询工具获取实时订单状态，而非直接给出解决方案",
    ],
    cases: ["2010030481639624749"],
  },
]

// ---------- main page ----------
export default function ReportPage() {
  const router = useRouter()
  const [activeDocTab, setActiveDocTab] = useState(docTabs[0]?.key ?? "")
  const [copied, setCopied] = useState(false)

  const bestTrend = SCORE_TREND.find(t => t.isBest)

  // nav items
  const navItems = [
    { id: "overview", label: "报告总结" },
    { id: "summary", label: "核心指标" },
    { id: "trend", label: "分数趋势" },
    { id: "analysis", label: "问题分析" },
    { id: "suggestions", label: "优化建议" },
    { id: "diff", label: "Agent 变更" },
    { id: "cases", label: "评测 Case" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
            <MapPin className="h-3.5 w-3.5" />
            <span>医药商服-骑手取货场景</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">{REPORT_META.taskName}</h1>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0 text-xs" onClick={async () => {
            const url = window.location.href
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url)
              } else {
                // fallback for non-HTTPS or unsupported browsers
                const el = document.createElement("textarea")
                el.value = url
                el.style.position = "fixed"
                el.style.opacity = "0"
                document.body.appendChild(el)
                el.select()
                document.execCommand("copy")
                document.body.removeChild(el)
              }
            } catch {
              // ignore
            }
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}>
            {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "已复制" : "分享报告"}
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        {/* Left nav (sticky) */}
        <aside className="hidden xl:flex flex-col gap-1 w-36 shrink-0 sticky top-20 self-start">
          {navItems.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-10">

          {/* ── 0. 报告总结 ── */}
          <Section id="overview" icon={<FileText className="h-4 w-4" />} title="报告总结">
            <Card className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="px-6 py-5 space-y-5">
                {/* Meta row */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground border-b border-border pb-4">
                  <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /><strong className="text-foreground">操作人：</strong>huangjin17</span>
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /><strong className="text-foreground">时间：</strong>2026-02-05</span>
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /><strong className="text-foreground">场景：</strong>医药商服-骑手取货场景</span>
                </div>
                {/* Summary bullets */}
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive text-[11px] font-bold">问</span>
                    <div>
                      <p className="font-medium text-foreground mb-1">发现的核心问题</p>
                      <p className="text-muted-foreground leading-relaxed">
                        归因分析覆盖 <strong className="text-foreground">4 条</strong>会话，识别出 <strong className="text-foreground">2 类</strong>主要问题：
                        ①&nbsp;<strong className="text-foreground">动作执行错误（75%）</strong>——模型在话术中承诺执行业务工具却未实际调用，属虚假承诺；且面对用户重复"转人工"诉求时机械挽留；
                        ②&nbsp;<strong className="text-foreground">知识理解错误（25%）</strong>——未识别关键信号（无骑手接单时长/商家品类/预定订单），导致决策偏差。
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">议</span>
                    <div>
                      <p className="font-medium text-foreground mb-1">优化建议摘要</p>
                      <p className="text-muted-foreground leading-relaxed">
                        针对上述问题提出 <strong className="text-foreground">3 个</strong>优化方向：
                        ①&nbsp;补充动作完整性要求（最高优先级）——在 Prompt ReAct 框架中约束承诺性话术必须以工具调用为前提；
                        ②&nbsp;强化负向约束说明——设定连续 2 次转人工即退出挽留路径；
                        ③&nbsp;增强信号识别指引——结构化标注关键业务阈值，避免主观臆断。
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">改</span>
                    <div>
                      <p className="font-medium text-foreground mb-1">Agent 变更范围</p>
                      <p className="text-muted-foreground leading-relaxed">
                        共修改 <strong className="text-foreground">1 份</strong>核心 Prompt 文档（智能总控Agent），新增了信号核对优先级说明与调度类工具成对调用约束，其余文档保持不变。
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">效</span>
                    <div>
                      <p className="font-medium text-foreground mb-1">最终评测效果</p>
                      <p className="text-muted-foreground leading-relaxed">
                        基线分数 <strong className="text-foreground">{REPORT_META.initialScore}</strong> → 最优版本（{REPORT_META.bestVersion}）分数 <strong className="text-primary">{REPORT_META.bestScore}</strong>，
                        提升 <strong className="text-emerald-600">+{REPORT_META.totalImprovement}</strong> 分，超过目标分 {REPORT_META.targetScore}。
                        {IMPROVED_CASES.length} 个 Case 分数提升，{UNCHANGED_CASES.length} 个 Case 持平，无下降 Case。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* ── 1. 核心指标 ── */}
          <Section id="summary" icon={<BarChart3 className="h-4 w-4" />} title="核心指标总览">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "基线分数", value: REPORT_META.initialScore, sub: "优化前", muted: true },
                { label: "最优分数", value: REPORT_META.bestScore, sub: `最优版本 ${REPORT_META.bestVersion}`, primary: true },
                { label: "总提升", value: `+${REPORT_META.totalImprovement}`, sub: "相比基线", up: true },
                { label: "优化轮次", value: `${REPORT_META.totalRounds}`, sub: `共 ${REPORT_META.sessionCount} 个 Case` },
              ].map(item => (
                <Card key={item.label} className={cn("rounded-2xl border", item.primary ? "border-primary/30 bg-primary/5" : "border-border")}>
                  <CardContent className="px-5 py-4">
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className={cn("text-3xl font-bold tracking-tight", item.primary ? "text-primary" : item.up ? "text-emerald-600" : item.muted ? "text-muted-foreground" : "text-foreground")}>
                      {item.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Target badge */}
            <div className="mt-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">
                目标分数 <strong className="text-foreground">{REPORT_META.targetScore}</strong> — 最优版本 <strong className="text-primary">{REPORT_META.bestScore}</strong> 已超越目标
              </span>
            </div>
          </Section>

          {/* ── 2. 分数趋势 ── */}
          <Section id="trend" icon={<TrendingUp className="h-4 w-4" />} title="分数趋势">
            <Card className="rounded-2xl border border-border">
              <CardContent className="px-5 py-5">
                {/* Bar chart */}
                <div className="flex items-end gap-4 h-28 mb-4">
                  {SCORE_TREND.map(t => {
                    const pct = (Number(t.score) / 100) * 100
                    const isBase = t.round === 0
                    const isBest = t.isBest
                    return (
                      <div key={t.round} className="flex flex-col items-center gap-1.5 flex-1">
                        <span className="text-xs font-bold text-foreground/80">{t.score}</span>
                        <div
                          className={cn("w-full rounded-t-lg transition-all", isBase ? "bg-muted-foreground/30" : isBest ? "bg-primary" : "bg-primary/40")}
                          style={{ height: `${Math.max(pct * 0.55, 6)}px` }}
                        />
                        <span className={cn("text-xs", isBest ? "font-bold text-primary" : "text-muted-foreground")}>
                          {t.versionName}{isBest ? " ★" : ""}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">{t.createdAt?.slice(5, 16)}</span>
                      </div>
                    )
                  })}
                </div>
                {/* Best version summary */}
                {bestTrend && (
                  <div className="rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground space-y-1 border border-border">
                    <div className="flex gap-4">
                      <span>改善 <strong className="text-emerald-600">{bestTrend.improvedCaseNums}</strong> 个</span>
                      <span>持平 <strong className="text-foreground">{bestTrend.unchangedCaseNums}</strong> 个</span>
                      <span>下降 <strong className="text-destructive">{bestTrend.worsenedCaseNums}</strong> 个</span>
                    </div>
                  </div>
                )}
                {/* Distribution */}
                <div className="grid grid-cols-2 gap-4 mt-4 border-t border-border pt-4 text-xs">
                  <div>
                    <p className="font-medium text-muted-foreground mb-2">Baseline 分布</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">优秀(≥90): {BASE_DIST.firstLevelCount}</span>
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">良好(70-89): {BASE_DIST.secondLevelCount}</span>
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">待改善(1-69): {BASE_DIST.thirdLevelCount}</span>
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">不合格(0): {BASE_DIST.lastLevelCount}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-2">最优版本({REPORT_META.bestVersion}) 分布</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">优秀(≥90): {BEST_DIST.firstLevelCount}</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">良好(70-89): {BEST_DIST.secondLevelCount}</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">待改善(1-69): {BEST_DIST.thirdLevelCount}</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">不合格(0): {BEST_DIST.lastLevelCount}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* ── 3. 问题分析 ── */}
          <Section
            id="analysis"
            icon={<Search className="h-4 w-4" />}
            title="问题分析"
            badge={<Badge variant="secondary" className="text-[10px] rounded-full">470条会话 · 覆盖率60%</Badge>}
          >
            <div className="space-y-4">
              {/* Cluster table */}
              <Card className="rounded-2xl border border-border">
                <CardHeader className="pb-2 px-5 pt-4">
                  <CardTitle className="text-sm">场景聚类分析</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">聚类名称</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">占比</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">会话数</th>
                          <th className="text-right py-2 pl-3 font-medium text-muted-foreground">转人工率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CLUSTER_DATA.map((c, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="py-2 pr-4 text-foreground">{c.name}</td>
                            <td className="py-2 px-3 text-right font-mono">{c.ratio}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">{c.count}</td>
                            <td className={cn("py-2 pl-3 text-right font-mono", parseFloat(c.transferRate) > 30 ? "text-destructive font-semibold" : "text-muted-foreground")}>
                              {c.transferRate}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Attribution */}
              <Card className="rounded-2xl border border-border">
                <CardHeader className="pb-2 px-5 pt-4">
                  <CardTitle className="text-sm">归因分析 <span className="text-xs font-normal text-muted-foreground ml-1">覆盖率 0.85%（4/470）</span></CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-4">
                  {ATTRIBUTION_DATA.map((a, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{a.name}</span>
                        <Badge variant="outline" className="text-[10px] rounded-full">{a.count}个 · {a.rate}</Badge>
                      </div>
                      <div className="space-y-1.5 ml-3">
                        {a.children.map((ch, j) => (
                          <div key={j} className="rounded-lg bg-muted/40 px-3 py-2 text-xs">
                            <p className="font-medium text-foreground mb-0.5">{ch.name}</p>
                            <p className="text-muted-foreground leading-relaxed">{ch.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </Section>

          {/* ── 4. 优化建议 ── */}
          <Section
            id="suggestions"
            icon={<Lightbulb className="h-4 w-4" />}
            title="优化建议"
            badge={<Badge variant="secondary" className="text-[10px] rounded-full">3个优化方向</Badge>}
          >
            <div className="space-y-4">
              {SUGGESTION_DATA.map((s, i) => (
                <Card key={i} className="rounded-2xl border border-border">
                  <CardContent className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</span>
                        <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[10px] rounded-full shrink-0",
                        i === 0 ? "border-red-300 text-red-600 bg-red-50" :
                          i === 1 ? "border-amber-300 text-amber-600 bg-amber-50" :
                            "border-blue-300 text-blue-600 bg-blue-50"
                      )}>{s.priority}</Badge>
                    </div>
                    <ol className="space-y-1.5 mb-3">
                      {s.items.map((item, j) => (
                        <li key={j} className="flex gap-2 text-xs text-muted-foreground">
                          <span className="shrink-0 text-primary font-medium">{j + 1}.</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                      <span className="text-[10px] text-muted-foreground mr-1">相关 Case：</span>
                      {s.cases.map(id => (
                        <span key={id} className="text-[10px] font-mono bg-muted/60 px-2 py-0.5 rounded text-muted-foreground">{id}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Section>

          {/* ── 5. Agent 变更 ── */}
          <Section id="diff" icon={<GitCompare className="h-4 w-4" />} title="Agent 变更">
            {/* Doc tabs */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {docTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveDocTab(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                    activeDocTab === tab.key
                      ? tab.hasChange ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-foreground shadow-sm"
                      : tab.hasChange
                        ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {tab.tagName}
                  {tab.hasChange && (
                    <span className={cn(
                      "text-[9px] px-1 py-0.5 rounded-full leading-none",
                      activeDocTab === tab.key ? "bg-white/30 text-white" : "bg-primary/20 text-primary"
                    )}>有变化</span>
                  )}
                </button>
              ))}
            </div>
            {docTabs.map(tab => (
              <div key={tab.key} style={{ display: activeDocTab === tab.key ? "block" : "none" }}>
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-2 border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    {tab.docName} / {tab.tagName}
                  </div>
                  <div className="p-4 max-h-[600px] overflow-y-auto">
                    {tab.fragments.map((frag, idx) =>
                      frag.type === "diff" ? (
                        <DiffBlock key={idx} search={frag.search} replace={frag.replace} />
                      ) : (
                        <div key={idx} className="text-xs text-foreground/80 mb-4">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{frag.content}</ReactMarkdown>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </Section>

          {/* ── 6. 评测 Case ── */}
          <Section
            id="cases"
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="评测 Case"
            badge={
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] rounded-full border-emerald-300 text-emerald-700 bg-emerald-50">提升 {IMPROVED_CASES.length} 个</Badge>
                <Badge variant="outline" className="text-[10px] rounded-full text-muted-foreground">持平 {UNCHANGED_CASES.length} 个</Badge>
              </div>
            }
          >
            <div className="space-y-6">
              {IMPROVED_CASES.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 mb-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">分数提升</span>
                  </div>
                  {IMPROVED_CASES.map(c => (
                    <CaseCard key={c.sessionId} c={c} type="improved" />
                  ))}
                </div>
              )}
              {UNCHANGED_CASES.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 mb-3">
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">分数持平</span>
                  </div>
                  {UNCHANGED_CASES.map(c => (
                    <CaseCard key={c.sessionId} c={c} type="unchanged" />
                  ))}
                </div>
              )}
            </div>
          </Section>

        </main>
      </div>
    </div>
  )
}
