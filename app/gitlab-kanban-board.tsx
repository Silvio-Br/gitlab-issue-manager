"use client"

import type React from "react"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Plus, Search, Filter, AlertCircle, GitlabIcon } from "lucide-react"
import { DndContext, closestCorners, DragOverlay } from "@dnd-kit/core"
import { type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { GitLabAPI } from "@/lib/gitlab-api"
import type { GitLabIssue, GitLabProject } from "@/types/gitlab"
import { kanbanConfig, getIssueColumn, getSortedColumns } from "@/config/kanban-config"
import { useLanguage } from "@/contexts/language-context"
import { useToast } from "@/hooks/use-toast"

// Import refactored components
import { KanbanColumn } from "@/components/kanban/kanban-column"
import { IssueModal } from "@/components/kanban/issue-modal"
import { IssueDetailModal } from "@/components/kanban/issue-detail-modal"
import { DeleteIssueDialog } from "@/components/kanban/delete-issue-dialog"

interface GitLabKanbanBoardProps {
  projectId: string
  gitlabToken?: string
  gitlabUrl?: string
  onRefreshReady?: (refreshFn: () => Promise<void>) => void
}

interface IssueForm {
  title: string
  description: string
  status: string
  labels: string[]
  assignee_id: number | null
  start_date: Date | null
  due_date: Date | null
}

interface KanbanColumnData {
  id: string
  name: string
  emoji?: string
  color: string
  issues: GitLabIssue[]
  totalIssues: number
  hasMore: boolean
}

const TICKETS_PER_COLUMN = 10

export default function GitLabKanbanBoard({
                                            projectId,
                                            gitlabToken,
                                            gitlabUrl,
                                            onRefreshReady,
                                          }: GitLabKanbanBoardProps) {
  // State management
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all")
  const [selectedState, setSelectedState] = useState<"all" | "opened" | "closed">("opened")

  const [issues, setIssues] = useState<GitLabIssue[]>([])
  const [project, setProject] = useState<GitLabProject | null>(null)
  const [columns, setColumns] = useState<Array<{ id: string; name: string; emoji?: string; color: string }>>([])
  const [activeIssue, setActiveIssue] = useState<GitLabIssue | null>(null)

  // Pagination state for each column
  const [columnLimits, setColumnLimits] = useState<Record<string, number>>({})

  // Modal states
  const [selectedIssue, setSelectedIssue] = useState<GitLabIssue | null>(null)
  const [editingIssue, setEditingIssue] = useState<GitLabIssue | null>(null)

  // Issue modal state (create/edit)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [issueModalMode, setIssueModalMode] = useState<"create" | "edit">("create")
  const [issueForm, setIssueForm] = useState<IssueForm>({
    title: "",
    description: "",
    status: "open",
    labels: [],
    assignee_id: null,
    start_date: null,
    due_date: null,
  })
  const [submittingIssue, setSubmittingIssue] = useState(false)

  // Delete confirmation state
  const [issueToDelete, setIssueToDelete] = useState<GitLabIssue | null>(null)
  const [deletingIssue, setDeletingIssue] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Optimistic updates state
  const [pendingUpdates, setPendingUpdates] = useState<Set<number>>(new Set())

  const gitlabApi = useMemo(() => new GitLabAPI(gitlabToken, gitlabUrl), [gitlabToken, gitlabUrl])
  const { t, language } = useLanguage()
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  // Custom link and image components for ReactMarkdown
  const CustomLink = useCallback(
    ({ href, children, ...props }: any) => {
      let finalHref = href

      // Transform relative /uploads/ URLs
      if (href && href.startsWith("/uploads/") && gitlabUrl && projectId) {
        finalHref = `${gitlabUrl}/-/project/${projectId}${href}`
      }

      return (
        <a
          href={finalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
          {...props}
        >
          {children}
        </a>
      )
    },
    [gitlabUrl, projectId],
  )

  const CustomImage = useCallback(
    ({ src, alt, ...props }: any) => {
      let finalSrc = src

      // Transform relative /uploads/ URLs
      if (src && src.startsWith("/uploads/") && gitlabUrl && projectId) {
        finalSrc = `${gitlabUrl}/-/project/${projectId}${src}`
      }

      return (
        <img
          src={finalSrc || "/placeholder.svg"}
          alt={alt}
          className="max-w-full h-auto rounded-lg border"
          {...props}
        />
      )
    },
    [gitlabUrl, projectId],
  )

  // Initialize column limits
  useEffect(() => {
    const initialLimits: Record<string, number> = {}
    getSortedColumns(kanbanConfig).forEach((column) => {
      initialLimits[column.id] = TICKETS_PER_COLUMN
    })
    setColumnLimits(initialLimits)
  }, [])

  // Load project data
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [projectData, issuesData] = await Promise.all([
          gitlabApi.getProject(projectId),
          gitlabApi.getIssues(projectId, { state: "all", per_page: 100 }),
        ])

        setProject(projectData)
        // @ts-expect-error - API response type mismatch
        setIssues(issuesData)

        const configColumns = getSortedColumns(kanbanConfig).map((columnConfig) => ({
          id: columnConfig.id,
          name: columnConfig.name,
          emoji: columnConfig.emoji,
          color: columnConfig.color,
        }))

        setColumns(configColumns)

        // Provide refresh function to parent
        if (onRefreshReady) {
          onRefreshReady(loadProjectData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t.error)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      loadProjectData()
    }
  }, [projectId, gitlabApi, t.error, onRefreshReady])

  // Get all status labels (from columns)
  const statusLabels = useMemo(() => {
    return kanbanConfig.columns.flatMap((col) => col.labels)
  }, [])

  // Get all non-status labels
  const allNonStatusLabels = useMemo(() => {
    const labelsSet = new Set<string>()
    issues.forEach((issue) => {
      issue.labels.forEach((label) => {
        // Exclude status labels
        const isStatusLabel = statusLabels.some(
          (statusLabel) =>
            label.toLowerCase().includes(statusLabel.toLowerCase()) ||
            statusLabel.toLowerCase().includes(label.toLowerCase()),
        )
        if (!isStatusLabel) {
          labelsSet.add(label)
        }
      })
    })
    return Array.from(labelsSet).sort()
  }, [issues, statusLabels])

  // Get available columns for status selection
  const availableColumns = useMemo(() => {
    return getSortedColumns(kanbanConfig)
  }, [])

  // Filter issues based on search and filters
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesSearch =
        searchQuery === "" ||
        issue.iid.toString().includes(searchQuery) ||
        issue.title.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesLabels = selectedLabels.length === 0 || selectedLabels.some((label) => issue.labels.includes(label))

      const matchesAssignee =
        selectedAssignee === "all" || issue.assignees.some((assignee) => assignee.name === selectedAssignee)

      const matchesState =
        selectedState === "all" ||
        (selectedState === "opened" && issue.state === "opened") ||
        (selectedState === "closed" && issue.state === "closed")

      return matchesSearch && matchesLabels && matchesAssignee && matchesState
    })
  }, [issues, searchQuery, selectedLabels, selectedAssignee, selectedState])

  // Distribute issues into columns based on configuration
  const columnsWithIssues = useMemo(() => {
    return columns.map((column) => {
      const columnIssues = filteredIssues.filter((issue) => {
        const assignedColumn = getIssueColumn(issue, kanbanConfig)
        return assignedColumn === column.id
      })

      const limit = columnLimits[column.id] || TICKETS_PER_COLUMN
      const visibleIssues = columnIssues.slice(0, limit)

      return {
        ...column,
        issues: visibleIssues,
        totalIssues: columnIssues.length,
        hasMore: columnIssues.length > limit,
      }
    })
  }, [columns, filteredIssues, columnLimits])

  const allAssignees = useMemo(() => {
    const assignees = new Set<string>()
    issues.forEach((issue) => issue.assignees.forEach((assignee) => assignees.add(assignee.name)))
    return Array.from(assignees)
  }, [issues])

  // Get all unique assignees with their IDs for the form
  const allAssigneesWithIds = useMemo(() => {
    const assigneesMap = new Map()
    issues.forEach((issue) => issue.assignees.forEach((assignee) => assigneesMap.set(assignee.id, assignee)))
    return Array.from(assigneesMap.values())
  }, [issues])

  // Event handlers
  const handleLabelFilter = (label: string, checked: boolean) => {
    if (checked) {
      setSelectedLabels((prev) => [...prev, label])
    } else {
      setSelectedLabels((prev) => prev.filter((l) => l !== label))
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedLabels([])
    setSelectedAssignee("all")
  }

  const handleLoadMore = (columnId: string) => {
    // Save current scroll position of the column
    const columnElement = document.querySelector(`[data-column-id="${columnId}"] .overflow-y-auto`)
    const currentScrollTop = columnElement?.scrollTop || 0

    setColumnLimits((prev) => ({
      ...prev,
      [columnId]: (prev[columnId] || TICKETS_PER_COLUMN) + TICKETS_PER_COLUMN,
    }))

    // Restore scroll position after re-render
    setTimeout(() => {
      if (columnElement) {
        columnElement.scrollTop = currentScrollTop
      }
    }, 0)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const issue = issues.find((i) => i.id.toString() === active.id)
    setActiveIssue(issue || null)
  }

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveIssue(null)

      if (!over) return

      const issueId = Number.parseInt(active.id as string)

      // Detect if over.id is a ticket or a column
      let newColumnId: string

      // Check if over.id is a column ID
      const isColumn = columns.some((col) => col.id === over.id)

      if (isColumn) {
        // It's a column
        newColumnId = over.id as string
      } else {
        // It's probably a ticket, find its column
        const targetIssueId = Number.parseInt(over.id as string)
        const targetIssue = issues.find((issue) => issue.id === targetIssueId)

        if (targetIssue) {
          newColumnId = getIssueColumn(targetIssue, kanbanConfig)
        } else {
          // Fallback: try to find column by ID
          newColumnId = over.id as string
        }
      }

      const issue = issues.find((i) => i.id === issueId)
      if (!issue) return

      const newColumn = availableColumns.find((col) => col.id === newColumnId)
      if (!newColumn) return

      // Get current column for rollback
      const currentColumnId = getIssueColumn(issue, kanbanConfig)
      if (currentColumnId === newColumnId) return // No change

      // Prepare new labels
      const statusLabels = kanbanConfig.columns.flatMap((col) => col.labels)
      const updatedLabels = issue.labels.filter(
        (label) =>
          !statusLabels.some(
            (statusLabel) =>
              label.toLowerCase().includes(statusLabel.toLowerCase()) ||
              statusLabel.toLowerCase().includes(label.toLowerCase()),
          ),
      )

      if (newColumn.matchCriteria === "labels" && newColumn.labels.length > 0) {
        updatedLabels.push(newColumn.labels[0])
      }

      // Optimistic update
      setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, labels: updatedLabels } : i)))
      setPendingUpdates((prev) => new Set(prev).add(issueId))

      try {
        // API call
        await gitlabApi.updateIssue(projectId, issue.iid, {
          labels: updatedLabels,
        })

        // Success - remove from pending
        setPendingUpdates((prev) => {
          const newSet = new Set(prev)
          newSet.delete(issueId)
          return newSet
        })

        toast({
          title: "✅ " + t.success,
          description: `${t.ticketMoved} #${issue.iid} ${t.movedTo} "${newColumn.name}"`,
          variant: "default",
        })
      } catch (err) {
        // Error - rollback
        setIssues((prev) => prev.map((i) => (i.id === issueId ? issue : i)))
        setPendingUpdates((prev) => {
          const newSet = new Set(prev)
          newSet.delete(issueId)
          return newSet
        })

        const errorMessage = err instanceof Error ? err.message : t.unknownError
        toast({
          title: "❌ " + t.error,
          description: `${t.cannotMoveTicket} #${issue.iid}: ${errorMessage}`,
          variant: "destructive",
        })
      }
    },
    [issues, columns, gitlabApi, projectId, toast, availableColumns, t],
  )

  const handleIssueClick = useCallback((issue: GitLabIssue) => {
    // Prevent double-click issues by using a callback
    setSelectedIssue((prev) => (prev?.id === issue.id ? prev : issue))
  }, [])

  const handleNewIssueClick = () => {
    setIssueModalMode("create")
    setIssueForm({
      title: "",
      description: "",
      status: "open",
      labels: [],
      assignee_id: null,
      start_date: null,
      due_date: null,
    })
    setShowIssueModal(true)
  }

  const handleEditIssueClick = (issue: GitLabIssue) => {
    setEditingIssue(issue)
    setIssueModalMode("edit")

    // Get non-status labels
    const statusLabels = kanbanConfig.columns.flatMap((col) => col.labels)
    const nonStatusLabels = issue.labels.filter(
      (label) =>
        !statusLabels.some(
          (statusLabel) =>
            label.toLowerCase().includes(statusLabel.toLowerCase()) ||
            statusLabel.toLowerCase().includes(label.toLowerCase()),
        ),
    )

    // Get current column
    const currentColumn = getIssueColumn(issue, kanbanConfig)

    setIssueForm({
      title: issue.title,
      description: issue.description || "",
      status: currentColumn,
      labels: nonStatusLabels,
      assignee_id: issue.assignees.length > 0 ? issue.assignees[0].id : null,
      start_date: issue.start_date ? new Date(issue.start_date) : null,
      due_date: issue.due_date ? new Date(issue.due_date) : null,
    })
    setShowIssueModal(true)
  }

  const handleEditFromDetailView = () => {
    if (selectedIssue) {
      setSelectedIssue(null) // Close detail view
      handleEditIssueClick(selectedIssue)
    }
  }

  const handleCloseIssueModal = useCallback(() => {
    setShowIssueModal(false)
    setEditingIssue(null)
    setIssueForm({
      title: "",
      description: "",
      status: "open",
      labels: [],
      assignee_id: null,
      start_date: null,
      due_date: null,
    })
  }, [])

  const handleSubmitIssue = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!issueForm.title.trim()) {
        return
      }

      try {
        setSubmittingIssue(true)

        // Build final labels
        const finalLabels = [...issueForm.labels]

        // Add status label if necessary
        const selectedColumn = availableColumns.find((col) => col.id === issueForm.status)
        if (selectedColumn && selectedColumn.matchCriteria === "labels" && selectedColumn.labels.length > 0) {
          finalLabels.push(selectedColumn.labels[0])
        }

        if (issueModalMode === "create") {
          // Create new issue
          const newIssue = await gitlabApi.createIssue(projectId, {
            title: issueForm.title,
            description: issueForm.description || undefined,
            labels: finalLabels.length > 0 ? finalLabels : undefined,
            assignee_ids: issueForm.assignee_id ? [issueForm.assignee_id] : undefined,
            due_date: issueForm.due_date ? format(issueForm.due_date, "yyyy-MM-dd") : undefined,
            start_date: issueForm.start_date ? format(issueForm.start_date, "yyyy-MM-dd") : undefined,
          })

          // Add the new issue to the list
          // @ts-expect-error - API response type mismatch
          setIssues((prev) => [newIssue, ...prev])

          toast({
            title: "✅ " + t.issueCreated,
            description: `${t.issue} #${newIssue.iid} "${newIssue.title}" ${t.createdSuccessfully}`,
            variant: "default",
          })
        } else if (issueModalMode === "edit" && editingIssue) {
          // Update existing issue
          await gitlabApi.updateIssue(projectId, editingIssue.iid, {
            labels: finalLabels.length > 0 ? finalLabels : undefined,
            assignee_ids: issueForm.assignee_id ? [issueForm.assignee_id] : [],
            due_date: issueForm.due_date ? format(issueForm.due_date, "yyyy-MM-dd") : null,
          })

          // Handle start date update via comment if it changed
          const currentStartDate = editingIssue.start_date
          const newStartDate = issueForm.start_date ? format(issueForm.start_date, "yyyy-MM-dd") : null

          if (currentStartDate !== newStartDate && newStartDate) {
            try {
              await gitlabApi.updateStartDate(projectId, editingIssue.iid, newStartDate)
            } catch (err) {
              console.error("Error updating start date:", err)
              // Continue even if comment addition fails
            }
          }

          // Update the issue in the list
          setIssues((prev) =>
            prev.map((issue) =>
              issue.id === editingIssue.id
                ? {
                    ...issue,
                    title: issueForm.title,
                    description: issueForm.description,
                    labels: finalLabels,
                    assignees: issueForm.assignee_id
                      ? allAssigneesWithIds.filter((a) => a.id === issueForm.assignee_id)
                      : [],
                    due_date: issueForm.due_date ? format(issueForm.due_date, "yyyy-MM-dd") : null,
                    start_date: newStartDate,
                  }
                : issue,
            ),
          )

          toast({
            title: "✅ " + t.issueUpdated,
            description: `${t.issue} #${editingIssue.iid} "${issueForm.title}" ${t.updatedSuccessfully}`,
            variant: "default",
          })
        }

        // Close modal and reset form
        handleCloseIssueModal()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t.operationError
        toast({
          title: "❌ " + t.error,
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setSubmittingIssue(false)
      }
    },
    [
      issueForm,
      gitlabApi,
      projectId,
      handleCloseIssueModal,
      toast,
      availableColumns,
      issueModalMode,
      editingIssue,
      allAssigneesWithIds,
      t,
    ],
  )

  const handleDeleteIssue = useCallback(
    async (issue: GitLabIssue) => {
      try {
        setDeletingIssue(true)

        await gitlabApi.deleteIssue(projectId, issue.iid)

        // Remove the issue from the list
        setIssues((prev) => prev.filter((i) => i.id !== issue.id))

        // Close the delete dialog
        setIssueToDelete(null)

        toast({
          title: "✅ " + t.issueDeleted,
          description: `${t.issue} #${issue.iid} "${issue.title}" ${t.deletedSuccessfully}`,
          variant: "default",
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t.deletionError
        toast({
          title: "❌ " + t.error,
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setDeletingIssue(false)
      }
    },
    [gitlabApi, projectId, toast, t],
  )

  // Loading state
  if (loading) {
    return (
      <div className="h-full bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96 mb-6" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-80" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-full bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full bg-gray-50 flex flex-col">
        <div className="flex-shrink-0 p-6 pb-0">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Avatar className="w-8 h-8 rounded-lg">
                    <AvatarImage src={project?.avatar_url || "/placeholder.svg"} alt={project?.name} />
                    <AvatarFallback className="rounded-lg">
                      <GitlabIcon className="w-5 h-5 text-orange-500" />
                    </AvatarFallback>
                  </Avatar>
                  {project?.name}
                </h1>
                <p className="text-gray-600 mt-1">{project?.description}</p>
              </div>
              <Button onClick={handleNewIssueClick}>
                <Plus className="w-4 h-4 mr-2" />
                {t.newIssue}
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t.searchByNumber}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Select
                  value={selectedState}
                  onValueChange={(value: "all" | "opened" | "closed") => setSelectedState(value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="opened">{t.opened}</SelectItem>
                    <SelectItem value="closed">{t.closed}</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10">
                      <Filter className="w-4 h-4 mr-2" />
                      {t.labels}
                      {selectedLabels.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedLabels.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                    <DropdownMenuLabel>{t.labels}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {allNonStatusLabels.map((label) => (
                      <DropdownMenuCheckboxItem
                        key={label}
                        checked={selectedLabels.includes(label)}
                        onCheckedChange={(checked) => handleLabelFilter(label, checked)}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t.assignedTo} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allAssignees}</SelectItem>
                    {allAssignees.map((assignee) => (
                      <SelectItem key={assignee} value={assignee}>
                        {assignee}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(searchQuery || selectedLabels.length > 0 || selectedAssignee !== "all") && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    {t.clearFilters}
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {filteredIssues.length} {filteredIssues.length !== 1 ? t.issuesFound : t.issueFound}
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-hidden px-6 pb-6">
          <div className="h-full overflow-x-auto">
            <div className="flex gap-4 h-full" style={{ minWidth: "max-content" }}>
              {columnsWithIssues.map((column) => (
                <div key={column.id} className="w-80 flex-shrink-0 h-full">
                  <KanbanColumn
                    column={column}
                    columns={columns}
                    pendingUpdates={pendingUpdates}
                    onIssueClick={handleIssueClick}
                    onEditClick={handleEditIssueClick}
                    onDeleteClick={setIssueToDelete}
                    onLoadMore={handleLoadMore}
                    onNewIssue={handleNewIssueClick}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeIssue ? (
          <Card className="cursor-grabbing shadow-lg rotate-3">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      #{activeIssue.iid}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-medium leading-tight">{activeIssue.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {activeIssue.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {activeIssue.description.replace(/[#*`]/g, "").substring(0, 100)}...
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>

      {/* Modals */}
      <IssueDetailModal
        issue={selectedIssue}
        columns={columns}
        onClose={() => setSelectedIssue(null)}
        onEdit={handleEditFromDetailView}
        customLinkComponent={CustomLink}
        customImageComponent={CustomImage}
      />

      <IssueModal
        isOpen={showIssueModal}
        onClose={handleCloseIssueModal}
        onSubmit={handleSubmitIssue}
        form={issueForm}
        setForm={setIssueForm}
        allAssigneesWithIds={allAssigneesWithIds}
        allNonStatusLabels={allNonStatusLabels}
        availableColumns={availableColumns}
        isSubmitting={submittingIssue}
        mode={issueModalMode}
        issue={editingIssue}
      />

      <DeleteIssueDialog
        issue={issueToDelete}
        isDeleting={deletingIssue}
        onClose={() => setIssueToDelete(null)}
        onConfirm={handleDeleteIssue}
      />
    </DndContext>
  )
}
