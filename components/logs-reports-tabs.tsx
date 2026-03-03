"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
import { FileText, Sparkles, GitCompare, Upload, Pencil, X, MessageSquare, TrendingUp } from "lucide-react"
import type { ReportSection, WorkflowStep, ModificationItem } from "@/app/page"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { REPORT_META, BEST_PROMPT_DIFF, SCORE_TREND, PROMPT_TABS, IMPROVED_CASES, UNCHANGED_CASES, BEST_DIST, BASE_DIST } from "@/lib/report-data"

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
  manual: "人工优化",
  confirmation: "人工确认",
}

// ---------- types ----------
interface CommentItem {
  id: string
  docLabel: string
  selectedText: string
  opinion: string
}

interface PromptDocTab {
  key: string
  docName: string
  tagName: string
  hasChange: boolean
  fragments: PromptDiffSegment[]
}

type PromptDiffSegment =
  | { type: "single"; content: string }
  | { type: "diff"; search: string; replace: string }

// ---------- version comparison data (from real API) ----------
const versionComparisonData = {
  baseline: { version: "BASELINE", label: "对比版本", score: parseFloat(REPORT_META.initialScore) },
  optimized: {
    version: REPORT_META.bestVersion,
    label: "最优版本",
    score: parseFloat(REPORT_META.bestScore),
    updateTime: SCORE_TREND.find(t => t.isBest)?.createdAt ?? "",
  },
}

// ---------- build prompt doc tabs from real data ----------
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
      // For changed tabs, try to apply diff (only relevant for 智能总控Agent)
      // For others, show side-by-side of bestContent vs baseContent
      const diffBlocks = parseBlocks(BEST_PROMPT_DIFF)
      const bestNorm = norm(tab.bestContent)
      // Check if any diff block search exists in base content
      const baseNorm = norm(tab.baseContent)
      let hasDiff = false
      for (const { search } of diffBlocks) {
        if (baseNorm.includes(norm(search).trimEnd())) { hasDiff = true; break }
      }
      if (hasDiff) {
        fragments = buildSegments(tab.baseContent, BEST_PROMPT_DIFF)
      } else {
        // Content changed but not via diff blocks — show as direct diff
        fragments = [{ type: "diff", search: tab.baseContent, replace: tab.bestContent }]
      }
    } else {
      fragments = [{ type: "single", content: tab.bestContent }]
    }
    return {
      key: tab.key,
      docName: tab.docName,
      tagName: tab.tagName,
      hasChange: tab.hasChange,
      fragments,
    }
  })
}

// ---------- helper: genId ----------
function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ---------- helper: getDocLabel from DOM ----------
function getDocLabelFromNode(node: Node | null): string {
  let el: Node | null = node
  let docName = ""
  let tagName = ""
  while (el && el !== document.body) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const e = el as HTMLElement
      const dn = e.getAttribute?.("data-doc-name")
      const tn = e.getAttribute?.("data-tag-name")
      if (dn) docName = dn
      if (tn) tagName = tn
    }
    el = el.parentNode
  }
  const parts = []
  if (docName) parts.push(docName)
  if (tagName) parts.push(tagName)
  return parts.length ? parts.join(" / ") : "未知文档"
}

// ---------- helper: isInsideSearchPane ----------
function isInsideSearchPane(node: Node | null): boolean {
  let el: Node | null = node
  while (el && el !== document.body) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const cls = (el as HTMLElement).className
      if (typeof cls === "string" && (cls.includes("diff-search-pane") || cls.includes("prompt-diff-search"))) return true
    }
    el = el.parentNode
  }
  return false
}

// ---------- helper: isInsideDocContent ----------
function isInsideDocContent(node: Node | null): boolean {
  let el: Node | null = node
  while (el && el !== document.body) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const cls = (el as HTMLElement).className
      if (typeof cls === "string" && cls.includes("prompt-doc-content")) return true
    }
    el = el.parentNode
  }
  return false
}

// ---------- helper: wrap/unwrap highlight ----------
function getTextSegments(range: Range): Array<{ node: Text; start: number; end: number }> {
  const segments: Array<{ node: Text; start: number; end: number }> = []
  const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT)
  let node = walker.currentNode as Text
  if (node.nodeType !== Node.TEXT_NODE) node = walker.nextNode() as Text
  while (node) {
    const start = node === range.startContainer ? range.startOffset : 0
    const end = node === range.endContainer ? range.endOffset : node.length
    if (start < end) segments.push({ node, start, end })
    node = walker.nextNode() as Text
  }
  return segments
}

function wrapWithHighlight(range: Range, commentId: string): boolean {
  const segments = getTextSegments(range)
  if (segments.length === 0) return false
  for (let i = segments.length - 1; i >= 0; i--) {
    const { node, start, end } = segments[i]
    const r = document.createRange()
    r.setStart(node, start)
    r.setEnd(node, end)
    const span = document.createElement("span")
    span.className = "comment-highlight"
    span.setAttribute("data-comment-id", commentId)
    span.style.cssText = "display:inline;text-decoration:underline;text-decoration-color:#dc2626;text-underline-offset:2px;background:transparent;cursor:pointer;"
    try { r.surroundContents(span) } catch { return false }
  }
  return true
}

function unwrapHighlight(commentId: string) {
  const escaped = commentId.replace(/"/g, '\\"')
  const spans = document.querySelectorAll(`span.comment-highlight[data-comment-id="${escaped}"]`)
  spans.forEach((span) => {
    if (!span.parentNode) return
    while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span)
    span.remove()
  })
}

// ---------- CaseDetails component ----------
type CaseItem = (typeof IMPROVED_CASES)[number]

function CaseCard({ c, index, isImproved }: { c: CaseItem; index: number; isImproved: boolean }) {
  const [open, setOpen] = useState(false)

  const signals = (c.systemSignal ?? "").match(/\{([^}]+)\}/g)?.map(s => {
    const inner = s.slice(1, -1)
    const colonIdx = inner.indexOf(":")
    return colonIdx >= 0
      ? { k: inner.slice(0, colonIdx).trim(), v: inner.slice(colonIdx + 1).trim() }
      : { k: inner.trim(), v: "" }
  }) ?? []

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <span className={cn(
          "shrink-0 text-xs font-bold px-2 py-0.5 rounded-full",
          isImproved ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {isImproved ? `+${Number(c.scoreImprovement).toFixed(0)}` : "持平"}
        </span>
        <span className="flex-1 text-xs font-medium text-foreground truncate">
          Case {index + 1} · <span className="text-muted-foreground">{c.sessionId}</span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground font-bold">{c.baselineScore}</span>
          <span className="text-xs text-muted-foreground">→</span>
          <span className="text-xs text-blue-600 font-bold">{c.optimizedScore}</span>
          <span className="text-muted-foreground text-xs ml-1">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Attribution tags */}
      <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
        {c.baselineAttributionLevel2 && (
          <span className="px-1.5 py-0.5 bg-muted text-muted-foreground border border-border rounded text-[10px]">
            基线归因: {c.baselineAttributionLevel2}
          </span>
        )}
        {c.optimizedAttributionLevel2 && c.optimizedAttributionLevel2 !== "无" ? (
          <span className="px-1.5 py-0.5 bg-muted text-muted-foreground border border-border rounded text-[10px]">
            优化后归因: {c.optimizedAttributionLevel2}
          </span>
        ) : (
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px]">
            优化后: 无问题 ✓
          </span>
        )}
      </div>

      {open && (
        <div className="border-t border-border divide-y divide-border">

          {/* 对话上下文 */}
          <div className="px-4 py-3 space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">对话上下文</p>
            {c.history && (
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {c.history}
              </div>
            )}
            {signals.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">系统信号</p>
                <div className="flex flex-wrap gap-1.5">
                  {signals.map(({ k, v }) => (
                    <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted border border-border rounded text-[10px] text-muted-foreground">
                      <span className="text-blue-500 font-medium">{k}</span>
                      {v && <span className="text-blue-800">{v}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 回复对比 */}
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">基线回复</p>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{c.baselineScore} 分</span>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-xs text-foreground/80 leading-relaxed mb-2">
                {c.baselineResponse}
              </div>
              {c.baselineAttributionDescription && (
                <div className="text-[11px] text-muted-foreground bg-muted/20 rounded p-2 leading-relaxed">
                  <span className="font-medium text-muted-foreground">问题：</span>{c.baselineAttributionDescription}
                </div>
              )}
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">优化后回复</p>
                <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{c.optimizedScore} 分</span>
              </div>
              <div className="bg-primary/5 rounded-lg p-3 text-xs text-foreground/80 leading-relaxed mb-2">
                {c.optimizedResponse}
              </div>
              {c.optimizedAttributionDescription && (
                <div className="text-[11px] text-muted-foreground bg-muted/20 rounded p-2 leading-relaxed">
                  <span className="font-medium text-primary/80">说明：</span>{c.optimizedAttributionDescription}
                </div>
              )}
            </div>
          </div>

          {/* 评分理由 */}
          {(c.baselineScoreCot || c.optimizedScoreCot) && (
            <div className="grid grid-cols-2 divide-x divide-border bg-muted/10">
              {c.baselineScoreCot && (
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">基线评分理由</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{c.baselineScoreCot}</p>
                </div>
              )}
              {c.optimizedScoreCot && (
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">优化后评分理由</p>
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

function CaseDetails() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">数据详情</span>
        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">改善 {IMPROVED_CASES.length}</Badge>
        <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">持平 {UNCHANGED_CASES.length}</Badge>
        <span className="ml-auto text-[11px] text-muted-foreground">点击展开查看上下文与回复对比</span>
      </div>
      <div className="p-3 space-y-2">
        {IMPROVED_CASES.map((c, i) => (
          <CaseCard key={c.sessionId} c={c} index={i} isImproved={true} />
        ))}
        {UNCHANGED_CASES.map((c, i) => (
          <CaseCard key={c.sessionId} c={c} index={IMPROVED_CASES.length + i} isImproved={false} />
        ))}
      </div>
    </div>
  )
}

// ---------- shared Markdown renderer with prose overrides ----------
const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ children }) => <h1 className="text-sm font-bold mt-3 mb-1.5 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xs font-bold mt-3 mb-1 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xs font-semibold mt-2 mb-0.5 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="text-xs leading-relaxed mb-1.5">{children}</p>,
  ul: ({ children }) => <ul className="text-xs list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="text-xs list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-")
    return isBlock
      ? <code className="block text-[11px] font-mono whitespace-pre-wrap break-all">{children}</code>
      : <code className="text-[11px] font-mono bg-black/5 rounded px-1">{children}</code>
  },
  pre: ({ children }) => <pre className="text-[11px] font-mono bg-black/5 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all mb-1.5">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-current pl-3 opacity-70 text-xs">{children}</blockquote>,
  hr: () => <hr className="border-current/20 my-2" />,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-black/5">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border/50">{children}</tr>,
  th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold border border-border/40 text-[11px]">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1.5 border border-border/40 align-top">{children}</td>,
}

// ---------- DiffBlock component ----------
function DiffBlock({ search, replace }: { search: string; replace: string }) {
  return (
    <div className="prompt-diff-block rounded-xl border border-border overflow-hidden mb-4">
      <div className="grid grid-cols-2 text-xs font-semibold border-b border-border">
        <div className="px-4 py-2 bg-red-50 text-red-600 border-r border-border">SEARCH（原内容）</div>
        <div className="px-4 py-2 bg-green-50 text-green-600">REPLACE（新内容）</div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border max-h-96 overflow-hidden">
        <div className="overflow-y-auto p-4 bg-red-50/40 diff-search-pane">
          <div className="prompt-doc-content text-red-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{search}</ReactMarkdown>
          </div>
        </div>
        <div className="overflow-y-auto p-4 bg-green-50/40">
          <div className="prompt-doc-content text-green-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{replace}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- SingleBlock component ----------
function SingleBlock({ content }: { content: string }) {
  return (
    <div className="prompt-diff-doc-block mb-4">
      <div className="prompt-doc-content text-foreground/80">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{content}</ReactMarkdown>
      </div>
    </div>
  )
}

// ---------- main component ----------
export function LogsReportsTabs({
  reports,
  onAddModification,
  modifications = [],
  onRemoveModification,
  onUpdateModification,
  onStartManualOptimization,
}: ReportsPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("reports")
  const [activeDocTabKey, setActiveDocTabKey] = useState("AgentPrompt/智能总控Agent")

  // version selector
  const [compareRound, setCompareRound] = useState(() => {
    const best = SCORE_TREND.find(t => t.isBest)
    return best ? best.round : SCORE_TREND[SCORE_TREND.length - 1].round
  })

  // dialog states
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [manualOptDialogOpen, setManualOptDialogOpen] = useState(false)
  const [syncConfirmed, setSyncConfirmed] = useState(false)
  const [overallSuggestion, setOverallSuggestion] = useState("")

  // inline comment (text-selection popover)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [showPopover, setShowPopover] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})
  const [selectedText, setSelectedText] = useState("")
  const [selectedDocLabel, setSelectedDocLabel] = useState("")
  const [commentOpinion, setCommentOpinion] = useState("")
  const tempCommentId = useRef<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const versionWrapRef = useRef<HTMLDivElement>(null)
  const reportsScrollRef = useRef<HTMLDivElement>(null)

  const promptDocTabs = buildPromptDocTabs()

  useEffect(() => { setMounted(true) }, [])

  // 当外部 modifications 删除某条时，同步清除本地 comments 高亮
  useEffect(() => {
    const modIds = new Set(modifications.map(m => m.id))
    setComments(prev => {
      const removed = prev.filter(c => !modIds.has(c.id))
      removed.forEach(c => unwrapHighlight(c.id))
      return prev.filter(c => modIds.has(c.id))
    })
  }, [modifications])

  // 新增报告时自动滚动到底部
  useEffect(() => {
    if (reports.length > 0 && reportsScrollRef.current) {
      reportsScrollRef.current.scrollTo({
        top: reportsScrollRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [reports.length])

  const formatTime = (date: Date) => {
    if (!mounted) return "--:--:--"
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  // Group tabs by docName for the tab row display
  const docTabRows = (() => {
    const rows: { docName: string; tabs: PromptDocTab[] }[] = []
    const map = new Map<string, PromptDocTab[]>()
    for (const tab of promptDocTabs) {
      if (!map.has(tab.docName)) map.set(tab.docName, [])
      map.get(tab.docName)!.push(tab)
    }
    map.forEach((tabs, docName) => rows.push({ docName, tabs }))
    return rows
  })()

  // ---- text selection comment logic ----
  const closePopover = useCallback(() => {
    if (tempCommentId.current) {
      unwrapHighlight(tempCommentId.current)
      tempCommentId.current = null
    }
    setShowPopover(false)
    setSelectedText("")
    setSelectedDocLabel("")
    setCommentOpinion("")
    window.getSelection()?.removeAllRanges()
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!versionWrapRef.current) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const text = sel.toString().trim()
    if (!text) return
    const range = sel.getRangeAt(0)
    if (!range) return
    if (!versionWrapRef.current.contains(range.commonAncestorContainer)) return
    if (isInsideSearchPane(range.commonAncestorContainer)) return
    if (!isInsideDocContent(range.commonAncestorContainer)) return

    const commentId = genId()
    if (wrapWithHighlight(range, commentId)) {
      tempCommentId.current = commentId
      window.getSelection()?.removeAllRanges()
    } else {
      tempCommentId.current = null
    }

    setSelectedText(text.length > 200 ? text.slice(0, 200) + "…" : text)
    setSelectedDocLabel(getDocLabelFromNode(range.commonAncestorContainer))
    setCommentOpinion("")

    const rect = range.getBoundingClientRect()
    const gap = 8
    const popW = 380
    const popH = 260
    const vw = window.innerWidth
    const vh = window.innerHeight
    let top = rect.bottom + gap + popH > vh - 20 ? Math.max(20, rect.top - popH - gap) : rect.bottom + gap
    let left = rect.left
    if (left + popW > vw - 20) left = vw - popW - 20
    if (left < 20) left = 20
    setPopoverStyle({ position: "fixed", top, left, zIndex: 9999 })
    setShowPopover(true)
  }, [])

  const confirmComment = useCallback(() => {
    const opinion = commentOpinion.trim() || "（无具体意见）"
    const id = tempCommentId.current || genId()
    tempCommentId.current = null
    setComments(prev => [...prev, {
      id,
      docLabel: selectedDocLabel || "未知文档",
      selectedText,
      opinion,
    }])
    // also propagate to parent as ModificationItem
    onAddModification?.({
      id,
      component: selectedDocLabel || "未知文档",
      originalContent: selectedText,
      modifiedContent: opinion,
    })
    setShowPopover(false)
    setSelectedText("")
    setSelectedDocLabel("")
    setCommentOpinion("")
  }, [commentOpinion, selectedDocLabel, selectedText, onAddModification])

  const removeComment = useCallback((id: string) => {
    unwrapHighlight(id)
    setComments(prev => prev.filter(c => c.id !== id))
    onRemoveModification?.(id)
  }, [onRemoveModification])

  // click outside popover
  useEffect(() => {
    if (!showPopover) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return
      closePopover()
    }
    const timer = setTimeout(() => document.addEventListener("click", handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("click", handler)
    }
  }, [showPopover, closePopover])

  const hasOptimizationReport = reports.some(r => r.step === "optimization")

  if (!mounted) {
    return (
      <div className="flex h-full flex-col bg-gradient-to-br from-background to-muted/30">
        <div className="shrink-0 px-8 py-6">
          <div className="h-7 w-28 bg-muted/30 animate-pulse rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gradient-to-br from-background to-muted/30">
      {reports.length === 0 ? (
        /* 无数据时的空状态 */
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-inner mb-5">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <p className="text-base font-medium text-muted-foreground">暂无优化报告</p>
          <p className="mt-1.5 text-sm text-muted-foreground/60">开始优化流程后，报告与版本对比将在此显示</p>
        </div>
      ) : (
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

          {/* ---- Reports Tab ---- */}
          <TabsContent value="reports" className="flex-1 overflow-y-auto m-0 mt-0">
            <div ref={reportsScrollRef} className="h-full overflow-y-auto">
              <div className="px-8 pb-8">
                {reports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-inner">
                      <FileText className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                    <p className="mt-5 text-base font-medium text-muted-foreground">暂无报告</p>
                    <p className="mt-1.5 text-sm text-muted-foreground/60">开始优化流程后，报告将在此显示</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {reports.map((report) => (
                      <Card key={report.id} className="border-0 shadow-md rounded-2xl overflow-hidden bg-card hover:shadow-lg transition-shadow duration-300">
                        <CardHeader className="pb-4 pt-5 px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-xl",
                                report.step === "analysis" && "bg-gradient-to-br from-blue-400/20 to-cyan-400/20",
                                report.step === "suggestions" && "bg-gradient-to-br from-amber-400/20 to-orange-400/20",
                                report.step === "optimization" && "bg-gradient-to-br from-emerald-400/20 to-teal-400/20",
                                report.step === "confirmation" && "bg-gradient-to-br from-violet-400/20 to-purple-400/20"
                              )}>
                                <Sparkles className={cn(
                                  "h-5 w-5",
                                  report.step === "analysis" && "text-blue-500",
                                  report.step === "suggestions" && "text-amber-500",
                                  report.step === "optimization" && "text-emerald-500",
                                  report.step === "confirmation" && "text-violet-500"
                                )} />
                              </div>
                              <Badge variant="secondary" className={cn(
                                "text-xs font-medium px-3 py-1 rounded-full border-0",
                                report.step === "analysis" && "bg-primary/10 text-primary",
                                report.step === "suggestions" && "bg-primary/10 text-primary",
                                report.step === "optimization" && "bg-emerald-100/80 text-emerald-600",
                                report.step === "confirmation" && "bg-primary/10 text-primary"
                              )}>
                                {stepLabels[report.step]}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground/60">{formatTime(report.timestamp)}</span>
                          </div>
                          <CardTitle className="text-lg font-semibold mt-4 text-foreground/90">{report.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h2: ({ children }) => <h2 className="mb-4 mt-6 text-base font-semibold first:mt-0 text-foreground">{children}</h2>,
                                h3: ({ children }) => <h3 className="mb-3 mt-5 text-sm font-semibold text-foreground/90">{children}</h3>,
                                h4: ({ children }) => <h4 className="mb-2 mt-4 text-sm font-medium text-foreground/80">{children}</h4>,
                                p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{children}</p>,
                                ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">{children}</ul>,
                                ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">{children}</ol>,
                                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold text-foreground/90">{children}</strong>,
                                code: ({ children }) => <code className="rounded-lg bg-muted/50 px-2 py-1 text-xs font-mono text-foreground/80">{children}</code>,
                                table: ({ children }) => (
                                  <div className="overflow-x-auto mb-4">
                                    <table className="w-full text-sm border-collapse">{children}</table>
                                  </div>
                                ),
                                thead: ({ children }) => <thead>{children}</thead>,
                                tbody: ({ children }) => <tbody>{children}</tbody>,
                                tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
                                th: ({ children }) => <th className="border border-border px-3 py-2 bg-muted/50 text-left font-medium text-foreground/80 text-xs">{children}</th>,
                                td: ({ children }) => <td className="border border-border px-3 py-2 text-muted-foreground text-xs">{children}</td>,
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
            </div> {/* reportsScrollRef */}
          </TabsContent>
          <TabsContent value="comparison" className="flex-1 overflow-y-auto m-0 mt-0">
            <div className="px-6 pb-8">
              {!hasOptimizationReport ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-inner">
                    <GitCompare className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <p className="mt-5 text-base font-medium text-muted-foreground">暂无版本对比</p>
                  <p className="mt-1.5 text-sm text-muted-foreground/60">完成优化流程后，版本对比将在此显示</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <h2 className="text-base font-semibold text-foreground">版本对比</h2>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-primary/40 text-primary hover:bg-primary/5" onClick={() => setManualOptDialogOpen(true)}>
                        <Pencil className="h-3.5 w-3.5" />人工优化
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={() => setSyncDialogOpen(true)}>
                        <Upload className="h-3.5 w-3.5" />同步线上
                      </Button>
                    </div>
                  </div>

                  {/* Version score cards */}
                  <div className="space-y-3">
                    {/* Version selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">对比版本：</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {SCORE_TREND.filter(t => t.round !== 0).map(t => (
                          <button
                            key={`cmp-${t.round}`}
                            onClick={() => setCompareRound(t.round)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all border",
                              compareRound === t.round
                                ? "bg-primary/15 text-primary border-primary/40"
                                : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:bg-primary/5"
                            )}
                          >
                            {t.versionName}
                            {t.isBest && <span className="text-[9px] text-primary">★</span>}
                            <span className="text-[10px] opacity-70">{t.score}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Score cards */}
                    {(() => {
                      const baseData = SCORE_TREND.find(t => t.round === 0) ?? SCORE_TREND[0]
                      const cmpData = SCORE_TREND.find(t => t.round === compareRound) ?? SCORE_TREND[SCORE_TREND.length - 1]
                      const diff = (parseFloat(cmpData.score) - parseFloat(baseData.score)).toFixed(1)
                      const isUp = parseFloat(diff) >= 0
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-border bg-muted/30 p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-base font-bold text-foreground">{baseData.versionName}</span>
                                <span className="ml-2 text-xs text-muted-foreground">对比版本</span>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">评测分数</div>
                                <div className="text-xl font-bold text-muted-foreground">{baseData.score}</div>
                              </div>
                            </div>
                          </div>
                          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-base font-bold text-foreground">{cmpData.versionName}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{cmpData.isBest ? "最优版本" : "对比版本"}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">评测分数</div>
                                <div className="flex items-baseline gap-1.5">
                                  <div className="text-xl font-bold text-primary">{cmpData.score}</div>
                                  <span className={cn("text-xs font-medium", isUp ? "text-emerald-600" : "text-destructive")}>
                                    {isUp ? "+" : ""}{diff}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Score trend + task meta */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">优化进展 · {REPORT_META.taskName}</span>
                      <span className="ml-auto text-xs text-muted-foreground">共 {REPORT_META.totalRounds} 轮 · 任务 {REPORT_META.taskId}</span>
                    </div>
                    {/* Trend bars */}
                    <div className="flex items-end gap-3 mb-3 h-16">
                      {SCORE_TREND.map((t) => {
                        const pct = (Number(t.score) / 100) * 100
                        const isBase = t.round === 0
                        const isBest = t.isBest
                        return (
                          <div key={t.round} className="flex flex-col items-center gap-1 flex-1">
                            <span className="text-[10px] font-bold text-foreground/80">{t.score}</span>
                            <div
                              className={cn(
                                "w-full rounded-t-md transition-all",
                                isBase ? "bg-muted-foreground/30" : isBest ? "bg-primary" : "bg-primary/40"
                              )}
                              style={{ height: `${Math.max(pct * 0.44, 4)}px` }}
                            />
                            <span className={cn("text-[10px]", isBest ? "font-bold text-primary" : "text-muted-foreground")}>
                              {t.versionName}{isBest ? " ★" : ""}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    {/* Case distribution */}
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-border pt-3">
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">Baseline 分布</p>
                        <div className="flex gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">优秀(≥90): {BASE_DIST.firstLevelCount}</span>
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">良好(70-89): {BASE_DIST.secondLevelCount}</span>
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">待改善(1-69): {BASE_DIST.thirdLevelCount}</span>
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">不合格(0): {BASE_DIST.lastLevelCount}</span>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">最优版本({REPORT_META.bestVersion}) 分布</p>
                        <div className="flex gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">优秀(≥90): {BEST_DIST.firstLevelCount}</span>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">良好(70-89): {BEST_DIST.secondLevelCount}</span>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">待改善(1-69): {BEST_DIST.thirdLevelCount}</span>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">不合格(0): {BEST_DIST.lastLevelCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Case details */}
                  <CaseDetails />

                  {/* Prompt diff with tabs + inline comment */}
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {/* Doc tab rows */}
                    <div className="border-b border-border px-4 pt-3 pb-0">
                      {docTabRows.map((row) => (
                        <div key={row.docName} className="mb-3">
                          <div className="text-xs font-medium text-muted-foreground mb-1.5">{row.docName}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {row.tabs.map((tab) => (
                              <button
                                key={tab.key}
                                onClick={() => setActiveDocTabKey(tab.key)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                                  activeDocTabKey === tab.key
                                    ? tab.hasChange
                                      ? "bg-primary text-primary-foreground shadow-sm"
                                      : "bg-muted text-foreground shadow-sm"
                                    : tab.hasChange
                                      ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                                )}
                              >
                                {tab.tagName}
                                <span className={cn(
                                  "text-[10px] px-1 py-0.5 rounded-full leading-none",
                                  tab.hasChange ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground",
                                  activeDocTabKey === tab.key && tab.hasChange && "bg-white/30 text-white"
                                )}>
                                  {tab.hasChange ? "有变化" : "无变化"}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tab content with selection-comment */}
                    <div className="flex gap-0">
                      {/* Main content area */}
                      <div
                        ref={versionWrapRef}
                        className="flex-1 min-w-0 p-4 select-text overflow-y-auto max-h-[60vh]"
                        onMouseUp={handleMouseUp}
                        style={{ userSelect: "text" }}
                      >
                        <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" />
                          在 REPLACE（新内容）区域选中文字，可添加修改意见
                        </div>

                        {promptDocTabs.map((tab) => (
                          <div
                            key={tab.key}
                            style={{ display: activeDocTabKey === tab.key ? "block" : "none" }}
                            data-doc-name={tab.docName}
                            data-tag-name={tab.tagName}
                          >
                            {tab.fragments.map((frag, idx) =>
                              frag.type === "diff" ? (
                                <DiffBlock key={idx} search={frag.search} replace={frag.replace} />
                              ) : (
                                <SingleBlock key={idx} content={frag.content} />
                              )
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Inline comments sidebar removed - modifications shown in left panel */}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )} {/* end reports.length > 0 */}
      {showPopover && (
        <div style={popoverStyle} onClick={(e) => e.stopPropagation()}>
          <div ref={popoverRef} className="w-96 rounded-xl border border-border bg-card shadow-xl p-4">
            {selectedDocLabel && (
              <p className="text-xs text-muted-foreground mb-2">文档：{selectedDocLabel}</p>
            )}
            <p className="text-xs font-medium text-foreground mb-1.5">选中的内容</p>
            <div className="mb-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground italic max-h-20 overflow-y-auto">
              "{selectedText}"
            </div>
            <p className="text-xs font-medium text-foreground mb-1.5">修改意见</p>
            <Textarea
              value={commentOpinion}
              onChange={(e) => setCommentOpinion(e.target.value)}
              placeholder="请输入对这部分内容的修改意见"
              className="min-h-[72px] rounded-lg text-sm mb-3 resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closePopover} className="rounded-full h-8 px-4">取消</Button>
              <Button size="sm" onClick={confirmComment} className="rounded-full h-8 px-4">确定</Button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Sync Dialog ---- */}
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
                <span className="text-sm text-muted-foreground">更新时间：{versionComparisonData.optimized.updateTime}</span>
              </div>
            </div>
            <div className="mt-6 flex items-start gap-3">
              <Checkbox id="sync-confirm" checked={syncConfirmed} onCheckedChange={(c) => setSyncConfirmed(c === true)} className="mt-0.5" />
              <label htmlFor="sync-confirm" className="text-sm font-medium text-foreground cursor-pointer">
                我已确认版本差异无误，同意同步到线上
              </label>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">请仔细检查上述变更内容，确认无误后勾选此选项以启用同步按钮。同步操作将影响生产环境，请谨慎操作。</p>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)} className="rounded-full">取消</Button>
            <Button onClick={() => { setSyncDialogOpen(false); setSyncConfirmed(false) }} disabled={!syncConfirmed} className="rounded-full">确认同步线上</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Manual Optimization Dialog ---- */}
      <Dialog open={manualOptDialogOpen} onOpenChange={setManualOptDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">人工优化</DialogTitle>
            <DialogDescription>查看并管理对版本对比内容的修改意见，填写总体修改建议后开始人工优化</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">已添加的修改意见</h4>
              {comments.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-xl text-center">
                  暂无修改意见，可在版本对比中选中 REPLACE（新内容）区域的文字添加
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((c, idx) => (
                    <div key={c.id} className="p-4 border border-border rounded-xl">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-medium text-foreground">{idx + 1}. {c.docLabel}</p>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeComment(c.id)}>
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5 mb-2 italic">"{c.selectedText}"</p>
                      <Textarea
                        value={c.opinion}
                        onChange={(e) => {
                          setComments(prev => prev.map(item => item.id === c.id ? { ...item, opinion: e.target.value } : item))
                          onUpdateModification?.(c.id, e.target.value)
                        }}
                        placeholder="修改意见（可编辑）"
                        className="min-h-[60px] rounded-xl text-sm resize-none"
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
                className="min-h-[120px] rounded-xl text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOptDialogOpen(false)} className="rounded-full">取消</Button>
            <Button onClick={() => { onStartManualOptimization?.(overallSuggestion); setManualOptDialogOpen(false); setOverallSuggestion("") }} className="rounded-full">
              开始人工优化
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
