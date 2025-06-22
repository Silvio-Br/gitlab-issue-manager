"use client"

import type React from "react"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Calendar,
  ExternalLink,
  AlertCircle,
  MessageSquare,
  User,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DragOverlay } from "@dnd-kit/core"
import ReactMarkdown from "react-markdown"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"

import { GitLabAPI } from "@/lib/gitlab-api"
import type { GitLabIssue, GitLabProject } from "@/types/gitlab"
import { kanbanConfig, getIssueColumn, getSortedColumns, type KanbanColumnConfig } from "@/config/kanban-config"
import { useLanguage } from "@/contexts/language-context"
import { useToast } from "@/hooks/use-toast"

interface KanbanColumn {
  id: string
  name: string
  emoji?: string
  color: string
  issues: GitLabIssue[]
  config: KanbanColumnConfig
}

interface GitLabComment {
  id: number
  body: string
  author: {
    id: number
    name: string
    username: string
    avatar_url: string
  }
  created_at: string
  updated_at: string
  system: boolean
}

interface GitLabKanbanBoardProps {
  projectId: string
  gitlabToken?: string
  gitlabUrl?: string
}

interface NewIssueForm {
  title: string
  description: string
  labels: string[]
  assignee_id: number | null
}

const TICKETS_PER_COLUMN = 10

export default function GitLabKanbanBoard({ projectId, gitlabToken, gitlabUrl }: GitLabKanbanBoardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all")
  const [selectedState, setSelectedState] = useState<"all" | "opened" | "closed">("opened")

  const [issues, setIssues] = useState<GitLabIssue[]>([])
  const [project, setProject] = useState<GitLabProject | null>(null)
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [activeIssue, setActiveIssue] = useState<GitLabIssue | null>(null)

  // Pagination state for each column
  const [columnLimits, setColumnLimits] = useState<Record<string, number>>({})

  // Modal state
  const [selectedIssue, setSelectedIssue] = useState<GitLabIssue | null>(null)

  // New issue modal state
  const [showNewIssueModal, setShowNewIssueModal] = useState(false)
  const [newIssueForm, setNewIssueForm] = useState<NewIssueForm>({
    title: "",
    description: "",
    labels: [],
    assignee_id: null,
  })
  const [creatingIssue, setCreatingIssue] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Optimistic updates state
  const [pendingUpdates, setPendingUpdates] = useState<Set<number>>(new Set())

  const gitlabApi = useMemo(() => new GitLabAPI(gitlabToken, gitlabUrl), [gitlabToken, gitlabUrl])
  const { t } = useLanguage()
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
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
        // @ts-expect-error
        setIssues(issuesData)

        const configColumns = getSortedColumns(kanbanConfig).map((columnConfig) => ({
          id: columnConfig.id,
          name: columnConfig.name,
          emoji: columnConfig.emoji,
          color: columnConfig.color,
          issues: [],
          config: columnConfig,
        }))

        setColumns(configColumns)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors du chargement des données")
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      loadProjectData()
    }
  }, [projectId, gitlabApi])

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
    setColumnLimits((prev) => ({
      ...prev,
      [columnId]: (prev[columnId] || TICKETS_PER_COLUMN) + TICKETS_PER_COLUMN,
    }))
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

      // Correction: détecter si over.id est un ticket ou une colonne
      let newColumnId: string

      // Vérifier si over.id est un ID de colonne
      const isColumn = columns.some((col) => col.id === over.id)

      if (isColumn) {
        // C'est une colonne
        newColumnId = over.id as string
      } else {
        // C'est probablement un ticket, trouver sa colonne
        const targetIssueId = Number.parseInt(over.id as string)
        const targetIssue = issues.find((issue) => issue.id === targetIssueId)

        if (targetIssue) {
          newColumnId = getIssueColumn(targetIssue, kanbanConfig)
        } else {
          // Fallback: essayer de trouver la colonne par l'ID
          newColumnId = over.id as string
        }
      }

      const issue = issues.find((i) => i.id === issueId)
      if (!issue) return

      const newColumn = columns.find((col) => col.id === newColumnId)
      if (!newColumn) return

      // Get current column for rollback
      const currentColumnId = getIssueColumn(issue, kanbanConfig)
      if (currentColumnId === newColumnId) return // No change

      // Le reste du code reste identique...
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

      if (newColumn.config.matchCriteria === "labels" && newColumn.config.labels.length > 0) {
        updatedLabels.push(newColumn.config.labels[0])
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
          title: "✅ Ticket déplacé",
          description: `Le ticket #${issue.iid} a été déplacé vers "${newColumn.name}"`,
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

        const errorMessage = err instanceof Error ? err.message : "Erreur inconnue"
        toast({
          title: "❌ Erreur",
          description: `Impossible de déplacer le ticket #${issue.iid}: ${errorMessage}`,
          variant: "destructive",
        })
      }
    },
    [issues, columns, gitlabApi, projectId, toast],
  )

  const handleIssueClick = useCallback((issue: GitLabIssue) => {
    // Prevent double-click issues by using a callback
    setSelectedIssue((prev) => (prev?.id === issue.id ? prev : issue))
  }, [])

  const handleNewIssueClick = () => {
    setShowNewIssueModal(true)
  }

  const handleCloseNewIssueModal = () => {
    setShowNewIssueModal(false)
    setNewIssueForm({
      title: "",
      description: "",
      labels: [],
      assignee_id: null,
    })
  }

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newIssueForm.title.trim()) {
      return
    }

    try {
      setCreatingIssue(true)

      const newIssue = await gitlabApi.createIssue(projectId, {
        title: newIssueForm.title,
        description: newIssueForm.description || undefined,
        labels: newIssueForm.labels.length > 0 ? newIssueForm.labels : undefined,
        assignee_ids: newIssueForm.assignee_id ? [newIssueForm.assignee_id] : undefined,
      })

      // Add the new issue to the list
      // @ts-expect-error
      setIssues((prev) => [newIssue, ...prev])

      // Close modal and reset form
      handleCloseNewIssueModal()

      toast({
        title: "✅ Issue créée",
        description: `L'issue #${newIssue.iid} "${newIssue.title}" a été créée avec succès`,
        variant: "default",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la création de l'issue"
      toast({
        title: "❌ Erreur",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCreatingIssue(false)
    }
  }

  function SortableIssue({ issue }: { issue: GitLabIssue }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: issue.id.toString(),
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    const getColumnColor = () => {
      const issueColumnId = getIssueColumn(issue, kanbanConfig)
      const column = columns.find((col) => col.id === issueColumnId)
      return column?.color || "#6b7280"
    }

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
    const isPending = pendingUpdates.has(issue.id)

    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <Card
          className={`cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing ${
            isPending ? "opacity-70 animate-pulse" : ""
          }`}
          onClick={(e) => {
            // Ne pas ouvrir la modale si on clique sur le menu dropdown
            if (!(e.target as Element).closest("[data-dropdown-trigger]")) {
              handleIssueClick(issue)
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
                      Fermé
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
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-dropdown-trigger>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuCheckboxItem asChild>
                    <a href={issue.web_url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t.viewInGitlab}
                    </a>
                  </DropdownMenuCheckboxItem>
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
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(issue.created_at).toLocaleDateString("fr-FR")}
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

  function DroppableColumn({ column }: { column: KanbanColumn & { totalIssues: number; hasMore: boolean } }) {
    const { setNodeRef, isOver } = useDroppable({ id: column.id })

    return (
      <div className="flex flex-col h-full">
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

        <div
          ref={setNodeRef}
          className={`bg-white rounded-b-lg flex-1 p-4 border border-t-0 transition-colors overflow-y-auto ${
            isOver ? "bg-blue-50 border-blue-200" : ""
          }`}
        >
          <div className="space-y-4">
            <SortableContext items={column.issues.map((i) => i.id.toString())} strategy={verticalListSortingStrategy}>
              {column.issues.map((issue) => (
                <SortableIssue key={issue.id} issue={issue} />
              ))}
            </SortableContext>

            {column.hasMore && (
              <Button variant="outline" className="w-full" onClick={() => handleLoadMore(column.id)} size="sm">
                <ChevronDown className="w-4 h-4 mr-2" />
                {t.loadMore} ({column.totalIssues - column.issues.length} remaining)
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full border-2 border-dashed border-gray-300 h-12"
              onClick={handleNewIssueClick}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.newIssue}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Composant pour les commentaires avec chargement à la demande
  function CollapsibleComments({ issue }: { issue: GitLabIssue }) {
    const [isOpen, setIsOpen] = useState(false)
    const [comments, setComments] = useState<GitLabComment[]>([])
    const [loading, setLoading] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)

    const loadComments = async () => {
      if (hasLoaded) return

      try {
        setLoading(true)
        const commentsData = await gitlabApi.getIssueComments(projectId, issue.iid)
        setComments(commentsData.filter((comment) => !comment.system))
        setHasLoaded(true)
      } catch (err) {
        console.error("Erreur lors du chargement des commentaires:", err)
        setComments([])
      } finally {
        setLoading(false)
      }
    }

    const handleToggle = () => {
      if (!isOpen && !hasLoaded) {
        loadComments()
      }
      setIsOpen(!isOpen)
    }

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto font-medium text-sm"
            onClick={handleToggle}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t.comments} ({issue.user_notes_count || 0})
            </div>
            <div className="flex items-center gap-1">
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
              <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={comment.author.avatar_url || "/placeholder.svg"} alt={comment.author.name} />
                      <AvatarFallback className="text-xs">
                        {comment.author.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{comment.author.name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{comment.body}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4">{t.noComments}</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  function IssueModal() {
    if (!selectedIssue) return null

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

    const displayLabels = getDisplayLabels(selectedIssue.labels)

    return (
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                #{selectedIssue.iid}
              </Badge>
              {selectedIssue.title}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="space-y-6">
              {/* Issue Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>
                      {t.createdBy} {selectedIssue.author.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(selectedIssue.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <Badge variant="secondary">
                    {(() => {
                      const columnId = getIssueColumn(selectedIssue, kanbanConfig)
                      const column = columns.find((col) => col.id === columnId)
                      return column ? column.name : "Non assigné"
                    })()}
                  </Badge>
                </div>

                {/* Labels */}
                {displayLabels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {displayLabels.map((label) => (
                      <Badge key={label} variant="secondary">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Assignees */}
                {selectedIssue.assignees.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t.assignedTo_}</h4>
                    <div className="flex gap-2">
                      {selectedIssue.assignees.map((assignee) => (
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
              {selectedIssue.description && (
                <>
                  <Separator />
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{selectedIssue.description}</ReactMarkdown>
                  </div>
                </>
              )}

              <Separator />

              {/* Comments */}
              <CollapsibleComments issue={selectedIssue} />

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button asChild>
                  <a href={selectedIssue.web_url} target="_blank" rel="noopener noreferrer">
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

  function labelsValue(labels: string[]): string {
    return labels.length === 0 ? "none" : labels.join("|") // never returns ""
  }

  function NewIssueModal() {
    const allLabelsForFilter = useMemo(() => {
      const labelsSet = new Set<string>()
      issues.forEach((issue) => issue.labels.forEach((label) => labelsSet.add(label)))
      return Array.from(labelsSet).sort()
    }, [issues])

    return (
      <Dialog open={showNewIssueModal} onOpenChange={setShowNewIssueModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t.newIssue}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateIssue}>
            <ScrollArea className="max-h-[calc(90vh-180px)] px-1">
              <div className="space-y-6 pr-3">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">{t.issueTitle_}</Label>
                  <Input
                    id="title"
                    value={newIssueForm.title}
                    onChange={(e) => setNewIssueForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Titre de l'issue..."
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">{t.issueDescription_}</Label>
                  <Textarea
                    id="description"
                    value={newIssueForm.description}
                    onChange={(e) => setNewIssueForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Description de l'issue (Markdown supporté)..."
                    rows={6}
                  />
                </div>

                {/* Labels */}
                {allLabelsForFilter.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t.labels}</Label>
                    <Select
                      value={labelsValue(newIssueForm.labels)}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setNewIssueForm((prev) => ({ ...prev, labels: [] }))
                        } else {
                          setNewIssueForm((prev) => ({ ...prev, labels: value.split("|") }))
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.selectLabels}>
                          {newIssueForm.labels.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {newIssueForm.labels.slice(0, 3).map((label) => (
                                <Badge key={label} variant="secondary" className="text-xs">
                                  {label}
                                </Badge>
                              ))}
                              {newIssueForm.labels.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{newIssueForm.labels.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            t.selectLabels
                          )}
                        </SelectValue>
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="none">{t.noLabels}</SelectItem>

                        {/* generate an item for each label; clicking toggles its presence */}
                        {allLabelsForFilter.map((label) => {
                          const next = newIssueForm.labels.includes(label)
                            ? newIssueForm.labels.filter((l) => l !== label)
                            : [...newIssueForm.labels, label]
                          return (
                            <SelectItem key={label} value={labelsValue(next)}>
                              <div className="flex items-center gap-2">
                                <Checkbox checked={newIssueForm.labels.includes(label)} />
                                {label}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Assignee */}
                {allAssigneesWithIds.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t.assignedTo_}</Label>
                    <Select
                      value={newIssueForm.assignee_id?.toString() || "none"}
                      onValueChange={(value) => {
                        setNewIssueForm((prev) => ({
                          ...prev,
                          assignee_id: value === "none" ? null : Number.parseInt(value),
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.selectAssignee}>
                          {newIssueForm.assignee_id
                            ? (() => {
                              const assignee = allAssigneesWithIds.find((a) => a.id === newIssueForm.assignee_id)
                              return assignee ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage
                                      src={assignee.avatar_url || "/placeholder.svg"}
                                      alt={assignee.name}
                                    />
                                    <AvatarFallback className="text-xs">
                                      {assignee.name
                                        .split(" ")
                                        .map((n: any[]) => n[0])
                                        .join("")
                                        .substring(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{assignee.name}</span>
                                </div>
                              ) : (
                                t.selectAssignee
                              )
                            })()
                            : t.selectAssignee}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t.noAssignee}</SelectItem>
                        {allAssigneesWithIds.map((assignee) => (
                          <SelectItem key={assignee.id} value={assignee.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={assignee.avatar_url || "/placeholder.svg"} alt={assignee.name} />
                                <AvatarFallback className="text-xs">
                                  {assignee.name
                                    .split(" ")
                                    .map((n: any[]) => n[0])
                                    .join("")
                                    .substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{assignee.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={handleCloseNewIssueModal}>
                {t.cancel}
              </Button>
              <Button type="submit" disabled={!newIssueForm.title.trim() || creatingIssue}>
                {creatingIssue ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.creating}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t.createIssue}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  const allLabelsForFilter = useMemo(() => {
    const labelsSet = new Set<string>()
    issues.forEach((issue) => issue.labels.forEach((label) => labelsSet.add(label)))
    return Array.from(labelsSet).sort()
  }, [issues])

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
                <h1 className="text-3xl font-bold text-gray-900">{project?.name}</h1>
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
                    <Button variant="outline" size="sm">
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
                    {allLabelsForFilter.map((label) => (
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
                    <SelectValue placeholder="Assigné à" />
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
              {filteredIssues.length} issue{filteredIssues.length !== 1 ? "s" : ""}{" "}
              {filteredIssues.length !== 1 ? t.issuesFound : t.issueFound}
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-hidden px-6 pb-6">
          <div className="h-full overflow-x-auto">
            <div className="flex gap-4 h-full" style={{ minWidth: "max-content" }}>
              {columnsWithIssues.map((column) => (
                <div key={column.id} className="w-80 flex-shrink-0 h-full">
                  <DroppableColumn column={column} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
      {selectedIssue && <IssueModal />}
      <NewIssueModal />
    </DndContext>
  )
}
