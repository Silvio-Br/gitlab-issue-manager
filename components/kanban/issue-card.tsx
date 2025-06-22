"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { MoreHorizontal, ExternalLink, Edit, Trash2, Calendar, Flag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import type { GitLabIssue } from "@/types/gitlab"
import { kanbanConfig, getIssueColumn } from "@/config/kanban-config"
import { useLanguage } from "@/contexts/language-context"
import { getDueDateColor } from "@/lib/date-utils"

interface IssueCardProps {
  issue: GitLabIssue
  columns: Array<{ id: string; color: string }>
  isPending: boolean
  onIssueClick: (issue: GitLabIssue) => void
  onEditClick: (issue: GitLabIssue) => void
  onDeleteClick: (issue: GitLabIssue) => void
}

export function IssueCard({ issue, columns, isPending, onIssueClick, onEditClick, onDeleteClick }: IssueCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id.toString(),
  })
  const { t } = useLanguage()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Get column color for the issue
  const getColumnColor = () => {
    const issueColumnId = getIssueColumn(issue, kanbanConfig)
    const column = columns.find((col) => col.id === issueColumnId)
    return column?.color || "#6b7280"
  }

  // Get display labels (non-status labels)
  const getDisplayLabels = (issueLabels: string[]) => {
    const columnLabels = kanbanConfig.columns.flatMap((col) => col.labels)
    return issueLabels.filter(
      (label) =>
        !columnLabels.some(
          (colLabel) =>
            label.toLowerCase().includes(colLabel.toLowerCase()) ||
            colLabel.toLowerCase().includes(label.toLowerCase()),
        ),
    )
  }

  const displayLabels = getDisplayLabels(issue.labels)

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={`cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing ${
          isPending ? "opacity-70 animate-pulse" : ""
        }`}
        onClick={(e) => {
          // Don't open modal if clicking on dropdown menu
          if (!(e.target as Element).closest("[data-dropdown-trigger]")) {
            onIssueClick(issue)
          }
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1" {...listeners}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs font-mono">
                  #{issue.iid}
                </Badge>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColumnColor() }} />
                {issue.state === "closed" && (
                  <Badge variant="secondary" className="text-xs">
                    {t.closed}
                  </Badge>
                )}
                {isPending && (
                  <Badge variant="outline" className="text-xs">
                    ⏳
                  </Badge>
                )}
              </div>
              <CardTitle className="text-sm font-medium leading-tight">{issue.title}</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditClick(issue)
                  }}
                  className="cursor-pointer"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t.edit}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(issue.web_url, "_blank")
                  }}
                  className="cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t.viewInGitlab}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteClick(issue)
                  }}
                  className="flex items-center text-red-600 focus:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0" {...listeners}>
          {issue.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {issue.description.replace(/[#*`]/g, "").substring(0, 100)}...
            </p>
          )}

          {displayLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {displayLabels.slice(0, 3).map((label) => (
                <Badge key={label} variant="secondary" className="text-xs">
                  {label}
                </Badge>
              ))}
              {displayLabels.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{displayLabels.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(issue.created_at).toLocaleDateString("fr-FR")}
              </div>
              {issue.due_date && (
                <div className="flex items-center gap-1">
                  <Flag className={`w-3 h-3 ${getDueDateColor(issue.due_date).icon}`} />
                  <span
                    className={`font-medium text-xs px-2 py-1 rounded-full ${getDueDateColor(issue.due_date).textColor} ${getDueDateColor(issue.due_date).bgColor} ${getDueDateColor(issue.due_date).borderColor} border`}
                  >
                    {new Date(issue.due_date).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              )}
            </div>
            <div className="flex -space-x-1">
              {issue.assignees.slice(0, 2).map((assignee) => (
                <Avatar key={assignee.id} className="w-6 h-6 border-2 border-white">
                  <AvatarImage src={assignee.avatar_url || "/placeholder.svg"} alt={assignee.name} />
                  <AvatarFallback className="text-xs">
                    {assignee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {issue.assignees.length > 2 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
                  +{issue.assignees.length - 2}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
