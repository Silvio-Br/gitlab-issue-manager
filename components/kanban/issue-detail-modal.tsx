"use client"

import type React from "react"

import { Edit, ExternalLink, User, Clock, PlayCircle, Flag } from "lucide-react"
import ReactMarkdown from "react-markdown"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import type { GitLabIssue } from "@/types/gitlab"
import { kanbanConfig, getIssueColumn } from "@/config/kanban-config"
import { useLanguage } from "@/contexts/language-context"
import { getDueDateColor, getDueDateLabel } from "@/lib/date-utils"
import { CollapsibleComments } from "./collapsible-comments"

interface IssueDetailModalProps {
  issue: GitLabIssue | null
  columns: Array<{ id: string; name: string; color: string }>
  onClose: () => void
  onEdit: () => void
  customLinkComponent: React.ComponentType<any>
  customImageComponent: React.ComponentType<any>
}

export function IssueDetailModal({
                                   issue,
                                   columns,
                                   onClose,
                                   onEdit,
                                   customLinkComponent: CustomLink,
                                   customImageComponent: CustomImage,
                                 }: IssueDetailModalProps) {
  const { t, language } = useLanguage()

  if (!issue) return null

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
    <Dialog open={!!issue} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              #{issue.iid}
            </Badge>
            {issue.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6 pr-2">
            {/* Issue Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>
                    {t.createdBy} {issue.author.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(issue.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
                <Badge variant="secondary">
                  {(() => {
                    const columnId = getIssueColumn(issue, kanbanConfig)
                    const column = columns.find((col) => col.id === columnId)
                    return column ? column.name : t.unassigned
                  })()}
                </Badge>
                {/* Labels on the same line as status */}
                {displayLabels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {displayLabels.map((label) => (
                      <Badge key={label} variant="secondary">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Dates - Separate line */}
              {(issue.start_date || issue.due_date) && (
                <div className="flex items-center gap-4 text-sm">
                  {issue.start_date && (
                    <div className="flex items-center gap-1">
                      <PlayCircle className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-sm px-2 py-1 rounded-md text-blue-600 bg-blue-50 border border-blue-200">
                        {t.startDate}: {new Date(issue.start_date).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  )}
                  {issue.due_date && (
                    <div className="flex items-center gap-2">
                      <Flag className={`w-4 h-4 ${getDueDateColor(issue.due_date).icon}`} />
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium text-sm px-2 py-1 rounded-md ${getDueDateColor(issue.due_date).textColor} ${getDueDateColor(issue.due_date).bgColor} ${getDueDateColor(issue.due_date).borderColor} border`}
                        >
                          {t.dueDate}: {new Date(issue.due_date).toLocaleDateString("fr-FR")}
                        </span>
                        <span className={`text-xs ${getDueDateColor(issue.due_date).textColor} opacity-75`}>
                          ({getDueDateLabel(issue.due_date, t)})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Assignees */}
              {issue.assignees.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">{t.assignedTo_}</h4>
                  <div className="flex gap-2">
                    {issue.assignees.map((assignee) => (
                      <div key={assignee.id} className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={assignee.avatar_url || "/placeholder.svg"} alt={assignee.name} />
                          <AvatarFallback className="text-xs">
                            {assignee.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assignee.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {issue.description && (
              <>
                <Separator />
                <div className="prose prose-sm max-w-none pr-4">
                  <ReactMarkdown
                    components={{
                      a: CustomLink,
                      img: CustomImage,
                    }}
                  >
                    {issue.description}
                  </ReactMarkdown>
                </div>
              </>
            )}

            <Separator />

            {/* Comments */}
            <CollapsibleComments issue={issue} />

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                {t.edit}
              </Button>
              <Button asChild variant="outline">
                <a href={issue.web_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t.viewInGitlab}
                </a>
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
