"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  ClipboardList,
  Plus,
  Trash2,
  ChevronLeft,
  Sparkles,
  User,
  LogOut,
} from "lucide-react"

// ---------- types ----------
interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
}

interface TaskItem {
  id: string
  name: string
}

interface SidebarProps {
  activeMenu?: string
  onMenuChange?: (id: string) => void
  tasks?: TaskItem[]
  currentTaskId?: string | null
  onCreateNew?: () => void
  onSelectTask?: (id: string) => void
  onDeleteTask?: (id: string) => void
}

// ---------- menu items ----------
const menuItems: MenuItem[] = [
  {
    id: "task-management",
    label: "优化任务管理",
    icon: <ClipboardList className="h-[18px] w-[18px] shrink-0" />,
  },
]

// ---------- Sidebar component ----------
export function Sidebar({
  activeMenu,
  onMenuChange,
  tasks = [],
  currentTaskId = null,
  onCreateNew,
  onSelectTask,
  onDeleteTask,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  return (
    <aside
      className={cn(
        "flex flex-col h-full shrink-0 overflow-hidden border-r border-border transition-all duration-300",
        "bg-[#F4F4EF]",
        collapsed ? "w-[60px] min-w-[60px]" : "w-[240px] min-w-[220px]"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center p-3 transition-all",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/80 to-primary shadow-sm">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-[#111827] tracking-tight">
              AutoAgent
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#374151] hover:text-primary hover:bg-[#EDECE5] transition-all"
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* New task button */}
      <div className="px-4 pb-2">
        <button
          onClick={onCreateNew}
          className={cn(
            "flex items-center justify-center gap-2 w-full rounded-full text-[14px] font-normal",
            "bg-[#e0dfd6] text-[#0b0909] border-none cursor-pointer transition-all hover:-translate-y-px",
            collapsed
              ? "h-[30px] w-[30px] rounded-full p-0 mx-auto"
              : "px-3 py-[5px]"
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>新建优化任务</span>}
        </button>
      </div>

      {/* Menu items */}
      <div className="px-2 space-y-0.5">
        {menuItems.map((item) => {
          const isActive = activeMenu === item.id
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange?.(isActive ? "" : item.id)}
              title={collapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-[6px] rounded-md text-[14px] transition-all text-left",
                collapsed && "justify-center px-[6px]",
                isActive
                  ? "bg-[#eef2ff] text-[#667eea] font-medium"
                  : "text-[#374151] hover:bg-[#EDECE5] hover:rounded-[20px]"
              )}
            >
              {item.icon}
              {!collapsed && <span className="flex-1">{item.label}</span>}
            </button>
          )
        })}
      </div>

      {/* Task history */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden mt-2">
        {!collapsed && (
          <div className="px-4 pt-2 pb-1">
            <span className="text-[13px] font-medium text-[#6b7280] uppercase tracking-[0.5px]">
              进行中优化任务
            </span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {!collapsed &&
            tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask?.(task.id)}
                className={cn(
                  "group flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all text-sm",
                  currentTaskId === task.id
                    ? "bg-[#EDECE5] font-medium text-[#111827]"
                    : "text-[#374151] hover:bg-[#EDECE5]"
                )}
              >
                <span className="flex-1 truncate text-[13px]">{task.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(task.id)
                  }}
                  className="invisible group-hover:visible p-0.5 rounded text-[#9ca3af] hover:text-red-500 transition-colors"
                  title="删除任务"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Bottom user section */}
      <div
        className={cn(
          "flex items-center gap-2.5 px-3 py-3 border-t border-border/50 mt-auto",
          collapsed && "justify-center"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/60 to-primary text-white text-xs font-bold">
          <User className="h-3.5 w-3.5" />
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 text-[13px] text-[#374151] truncate">当前用户</span>
            <button className="text-[#9ca3af] hover:text-[#374151] transition-colors" title="退出">
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Delete confirm overlay */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-5 w-72">
            <p className="text-sm font-medium text-foreground mb-4">确认删除该优化任务吗？</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-1.5 rounded-full text-sm border border-border text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onDeleteTask?.(deleteTarget)
                  setDeleteTarget(null)
                }}
                className="px-4 py-1.5 rounded-full text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
