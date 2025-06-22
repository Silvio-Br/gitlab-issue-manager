"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import type { GitLabIssue } from "@/types/gitlab"
import { useLanguage } from "@/contexts/language-context"
import { IssueCard } from "./issue-card"

interface KanbanColumnData {
  id: string
  name: string
  emoji?: string
  color: string
  issues: GitLabIssue[]
  totalIssues: number
  hasMore: boolean
}

interface KanbanColumnProps {
  column: KanbanColumnData
  columns: Array<{ id: string; color: string }>
  pendingUpdates: Set<number>
  onIssueClick: (issue: GitLabIssue) => void
  onEditClick: (issue: GitLabIssue) => void
  onDeleteClick: (issue: GitLabIssue) => void
  onLoadMore: (columnId: string) => void
  onNewIssue: () => void
}

export function KanbanColumn({
                               column,
                               columns,
                               pendingUpdates,
                               onIssueClick,
                               onEditClick,
                               onDeleteClick,
                               onLoadMore,
                               onNewIssue,
                             }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const { t } = useLanguage()

  return (
    <div className="flex flex-col h-full" data-column-id={column.id}>
      {/* Column Header */}
      <div className="rounded-t-lg p-4 border-b flex-shrink-0" style={{ backgroundColor: `${column.color}20` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              {column.emoji && <span>{column.emoji}</span>}
              {column.name}
            </h3>
          </div>
          <Badge variant="secondary">{column.totalIssues}</Badge>
        </div>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={`bg-white rounded-b-lg flex-1 p-4 border border-t-0 transition-colors overflow-y-auto ${
          isOver ? "bg-blue-50 border-blue-200" : ""
        }`}
      >
        <div className="space-y-4">
          <SortableContext items={column.issues.map((i) => i.id.toString())} strategy={verticalListSortingStrategy}>
            {column.issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                columns={columns}
                isPending={pendingUpdates.has(issue.id)}
                onIssueClick={onIssueClick}
                onEditClick={onEditClick}
                onDeleteClick={onDeleteClick}
              />
            ))}
          </SortableContext>

          {/* Load More Button */}
          {column.hasMore && (
            <Button variant="outline" className="w-full" onClick={() => onLoadMore(column.id)} size="sm">
              <ChevronDown className="w-4 h-4 mr-2" />
              {t.loadMore} ({column.totalIssues - column.issues.length} {t.remaining})
            </Button>
          )}

          {/* New Issue Button */}
          <Button variant="ghost" className="w-full border-2 border-dashed border-gray-300 h-12" onClick={onNewIssue}>
            <Plus className="w-4 h-4 mr-2" />
            {t.newIssue}
          </Button>
        </div>
      </div>
    </div>
  )
}
