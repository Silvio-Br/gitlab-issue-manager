"use client"

import { useMemo } from "react"
import { format, differenceInDays } from "date-fns"
import { fr, enUS } from "date-fns/locale"
import { ExternalLink, Calendar, Flag } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import type { GitLabIssue } from "@/types/gitlab"
import { kanbanConfig, getIssueColumn } from "@/config/kanban-config"
import { useLanguage } from "@/contexts/language-context"
import { getDueDateColor } from "@/lib/date-utils"

interface GanttIssue extends GitLabIssue {
  startDate: Date
  endDate: Date
  duration: number
}

interface GanttTaskProps {
  issue: GanttIssue
  timelineDays: Date[]
  timelineBounds: { start: Date; end: Date }
}

export function GanttTask({ issue, timelineDays, timelineBounds }: GanttTaskProps) {
  const { t, language } = useLanguage()

  // Calculate task bar position and width
  const taskBarStyle = useMemo(() => {
    const dayWidth = 40 // 40px per day
    const startOffset = differenceInDays(issue.startDate, timelineBounds.start)
    const taskWidth = issue.duration * dayWidth

    return {
      left: `${Math.max(0, startOffset * dayWidth)}px`,
      width: `${taskWidth}px`,
    }
  }, [issue, timelineBounds])

  // Get column info for the issue
  const columnInfo = useMemo(() => {
    const columnId = getIssueColumn(issue, kanbanConfig)
    const column = kanbanConfig.columns.find((col) => col.id === columnId)
    return column || { name: t.unassigned, color: "#6b7280", emoji: "" }
  }, [issue, t.unassigned])

  // Get display labels (non-status labels)
  const displayLabels = useMemo(() => {
    const statusLabels = kanbanConfig.columns.flatMap((col) => col.labels)
    return issue.labels.filter(
      (label) =>
        !statusLabels.some(
          (statusLabel) =>
            label.toLowerCase().includes(statusLabel.toLowerCase()) ||
            statusLabel.toLowerCase().includes(label.toLowerCase()),
        ),
    )
  }, [issue.labels])

  // Get due date styling
  const dueDateStyle = getDueDateColor(issue.due_date!)

  return (
    <TooltipProvider>
      <div className="flex border-b hover:bg-gray-50 transition-colors">
        {/* Task Info Column */}
        <div className="w-80 p-3 border-r bg-white">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                #{issue.iid}
              </Badge>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: columnInfo.color }} />
              {issue.state === "closed" && (
                <Badge variant="secondary" className="text-xs">
                  {t.closed}
                </Badge>
              )}
            </div>

            <h4 className="text-sm font-medium leading-tight line-clamp-2">{issue.title}</h4>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(issue.startDate, "dd/MM", { locale: language === "fr" ? fr : enUS })}
              </div>
              <span>→</span>
              <div className="flex items-center gap-1">
                <Flag className={`w-3 h-3 ${dueDateStyle.icon}`} />
                {format(issue.endDate, "dd/MM", { locale: language === "fr" ? fr : enUS })}
              </div>
              <span className="text-gray-400">({issue.duration}d)</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  {columnInfo.emoji && <span className="mr-1">{columnInfo.emoji}</span>}
                  {columnInfo.name}
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                {issue.assignees.slice(0, 2).map((assignee) => (
                  <Tooltip key={assignee.id}>
                    <TooltipTrigger>
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={assignee.avatar_url || "/placeholder.svg"} alt={assignee.name} />
                        <AvatarFallback className="text-xs">
                          {assignee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{assignee.name}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {issue.assignees.length > 2 && (
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                    +{issue.assignees.length - 2}
                  </div>
                )}
              </div>
            </div>

            {displayLabels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {displayLabels.slice(0, 2).map((label) => (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
                {displayLabels.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{displayLabels.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Timeline Column */}
        <div className="flex-1 relative overflow-x-auto">
          <div className="relative h-20 flex items-center" style={{ minWidth: `${timelineDays.length * 40}px` }}>
            {/* Timeline grid */}
            <div className="absolute inset-0 flex">
              {timelineDays.map((day, index) => (
                <div
                  key={day.toISOString()}
                  className={`w-10 border-r ${index % 7 === 0 || index % 7 === 6 ? "bg-gray-50" : ""}`}
                />
              ))}
            </div>

            {/* Task bar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute h-6 rounded cursor-pointer transition-all hover:h-8 hover:shadow-md z-10 flex items-center justify-between px-2"
                  style={{
                    ...taskBarStyle,
                    backgroundColor: `${columnInfo.color}40`,
                    border: `2px solid ${columnInfo.color}`,
                    minWidth: "60px",
                  }}
                >
                  <span className="text-xs font-medium text-gray-700 truncate">#{issue.iid}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 opacity-0 hover:opacity-100 transition-opacity"
                    onClick={() => window.open(issue.web_url, "_blank")}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-sm">
                <div className="space-y-2">
                  <div className="font-medium">
                    #{issue.iid} - {issue.title}
                  </div>
                  <div className="text-xs space-y-1">
                    <div>
                      <strong>{t.startDate}:</strong>{" "}
                      {format(issue.startDate, "PPP", { locale: language === "fr" ? fr : enUS })}
                    </div>
                    <div>
                      <strong>{t.dueDate}:</strong>{" "}
                      {format(issue.endDate, "PPP", { locale: language === "fr" ? fr : enUS })}
                    </div>
                    <div>
                      <strong>{t.duration}:</strong> {issue.duration} {issue.duration > 1 ? t.days : t.day}
                    </div>
                    <div>
                      <strong>{t.status}:</strong> {columnInfo.name}
                    </div>
                    {issue.assignees.length > 0 && (
                      <div>
                        <strong>{t.assignedTo}:</strong> {issue.assignees.map((a) => a.name).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
