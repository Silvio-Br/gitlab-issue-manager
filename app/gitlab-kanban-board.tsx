"use client"

import type React from "react"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  Plus,
  MoreHorizontal,
  Calendar,
  ExternalLink,
  MessageSquare,
  User,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
  Trash2,
  CalendarDays,
} from "lucide-react"
import { Search, Filter, AlertCircle } from "lucide-react"
import { DndContext, closestCorners, DragOverlay } from "@dnd-kit/core"
import {
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import ReactMarkdown from "react-markdown"
import { format } from "date-fns"
import { fr, enUS } from "date-fns/locale"

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
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { GitLabAPI } from "@/lib/gitlab-api"
import type { GitLabIssue, GitLabProject } from "@/types/gitlab"
import { kanbanConfig, getIssueColumn, getSortedColumns, type KanbanColumnConfig } from "@/config/kanban-config"
import { useLanguage } from "@/contexts/language-context"
import { useToast } from "@/hooks/use-toast"

// Utility function to get due date color based on urgency
const getDueDateColor = (dueDate: string) => {
  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    // Overdue - Red
    return {
      textColor: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      icon: "text-red-500",
    }
  } else if (diffDays <= 1) {
    // Due today or tomorrow - Orange
    return {
      textColor: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      icon: "text-orange-500",
    }
  } else if (diffDays <= 3) {
    // Due in 2-3 days - Amber
    return {
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      icon: "text-amber-500",
    }
  } else if (diffDays <= 7) {
    // Due in a week - Yellow
    return {
      textColor: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      icon: "text-yellow-500",
    }
  } else {
    // Not urgent - Green/Normal
    return {
      textColor: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      icon: "text-green-500",
    }
  }
}

// Utility function to get due date label with i18n
const getDueDateLabel = (dueDate: string, t: any) => {
  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays)
    return `${t.overdueDays} ${overdueDays} ${overdueDays > 1 ? t.days : t.day}`
  } else if (diffDays === 0) {
    return t.dueToday
  } else if (diffDays === 1) {
    return t.dueTomorrow
  } else {
    return `${t.dueInDays} ${diffDays} ${diffDays > 1 ? t.days : t.day}`
  }
}

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
  status: string // ID de la colonne
  labels: string[] // Labels non-statut
  assignee_id: number | null
  start_date: Date | null
  due_date: Date | null
}

const TICKETS_PER_COLUMN = 10

// Ajouter cette interface avant le composant principal
interface NewIssueModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  form: NewIssueForm
  setForm: React.Dispatch<React.SetStateAction<NewIssueForm>>
  allAssigneesWithIds: any[]
  allNonStatusLabels: string[]
  availableColumns: KanbanColumnConfig[]
  isCreating: boolean
  t: any
  language: string
}

// Définir NewIssueModal comme composant séparé avant GitLabKanbanBoard
function NewIssueModal({
                         isOpen,
                         onClose,
                         onSubmit,
                         form,
                         setForm,
                         allAssigneesWithIds,
                         allNonStatusLabels,
                         availableColumns,
                         isCreating,
                         t,
                         language,
                       }: NewIssueModalProps) {
  const [customLabelInput, setCustomLabelInput] = useState("")
  const [showCustomLabelInput, setShowCustomLabelInput] = useState(false)

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {t.newIssue}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-1">
            <div className="space-y-6 pr-3 pb-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t.issueTitle_}</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={t.issueTitlePlaceholder}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t.issueDescription_}</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={t.issueDescriptionPlaceholder}
                  rows={6}
                />
              </div>

              {/* Status (Column) */}
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => {
                    setForm((prev) => ({ ...prev, status: value }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut">
                      {form.status
                        ? (() => {
                          const column = availableColumns.find((col) => col.id === form.status)
                          return column ? (
                            <div className="flex items-center gap-2">
                              {column.emoji && <span>{column.emoji}</span>}
                              <span>{column.name}</span>
                            </div>
                          ) : (
                            "Sélectionner un statut"
                          )
                        })()
                        : "Sélectionner un statut"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        <div className="flex items-center gap-2">
                          {column.emoji && <span>{column.emoji}</span>}
                          <span>{column.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="space-y-2">
                  <Label>{t.startDate}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {form.start_date ? (
                          format(form.start_date, "PPP", { locale: language === "fr" ? fr : enUS })
                        ) : (
                          <span className="text-muted-foreground">{t.selectStartDate}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={form.start_date || undefined}
                        onSelect={(date) => setForm((prev) => ({ ...prev, start_date: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label>{t.dueDate}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {form.due_date ? (
                          format(form.due_date, "PPP", { locale: language === "fr" ? fr : enUS })
                        ) : (
                          <span className="text-muted-foreground">{t.selectDueDate}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={form.due_date || undefined}
                        onSelect={(date) => setForm((prev) => ({ ...prev, due_date: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Other Labels */}
              {(allNonStatusLabels.length > 0 || showCustomLabelInput) && (
                <div className="space-y-2">
                  <Label>Labels</Label>

                  {/* Selected labels */}
                  {form.labels.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.labels.map((label) => (
                        <Badge key={label} variant="secondary" className="text-xs flex items-center gap-1">
                          {label}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 w-4 h-4 hover:bg-transparent"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                labels: prev.labels.filter((l) => l !== label),
                              }))
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Custom label input */}
                  {showCustomLabelInput && (
                    <div className="flex gap-2 mb-2 items-center">
                      <Input
                        placeholder={t.newLabelPlaceholder}
                        value={customLabelInput}
                        onChange={(e) => setCustomLabelInput(e.target.value)}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            if (customLabelInput.trim() && !form.labels.includes(customLabelInput.trim())) {
                              setForm((prev) => ({
                                ...prev,
                                labels: [...prev.labels, customLabelInput.trim()],
                              }))
                              setCustomLabelInput("")
                              setShowCustomLabelInput(false)
                            }
                          }
                          if (e.key === "Escape") {
                            setCustomLabelInput("")
                            setShowCustomLabelInput(false)
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (customLabelInput.trim() && !form.labels.includes(customLabelInput.trim())) {
                            setForm((prev) => ({
                              ...prev,
                              labels: [...prev.labels, customLabelInput.trim()],
                            }))
                            setCustomLabelInput("")
                            setShowCustomLabelInput(false)
                          }
                        }}
                      >
                        {t.save}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomLabelInput("")
                          setShowCustomLabelInput(false)
                        }}
                      >
                        {t.cancel}
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2 items-center">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value && !form.labels.includes(value)) {
                          setForm((prev) => ({
                            ...prev,
                            labels: [...prev.labels, value],
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={t.addLabel} />
                      </SelectTrigger>
                      <SelectContent>
                        {allNonStatusLabels
                          .filter((label) => !form.labels.includes(label))
                          .map((label) => (
                            <SelectItem key={label} value={label}>
                              {label}
                            </SelectItem>
                          ))}
                        {allNonStatusLabels.filter((label) => !form.labels.includes(label)).length === 0 && (
                          <div className="px-3 py-2 text-gray-500 text-sm">Tous les labels sont sélectionnés</div>
                        )}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomLabelInput(true)}
                      className="whitespace-nowrap flex-shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t.createNewLabel}
                    </Button>
                  </div>
                </div>
              )}

              {/* Assignee */}
              {allAssigneesWithIds.length > 0 && (
                <div className="space-y-2">
                  <Label>{t.assignedTo_}</Label>
                  <Select
                    value={form.assignee_id?.toString() || "none"}
                    onValueChange={(value) => {
                      setForm((prev) => ({
                        ...prev,
                        assignee_id: value === "none" ? null : Number.parseInt(value),
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectAssignee}>
                        {form.assignee_id
                          ? (() => {
                            const assignee = allAssigneesWithIds.find((a) => a.id === form.assignee_id)
                            return assignee ? (
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
          </div>
        </ScrollArea>

        {/* Actions en bas, toujours visibles */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4 flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button type="button" disabled={!form.title.trim() || isCreating} onClick={handleFormSubmit}>
            {isCreating ? (
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
      </DialogContent>
    </Dialog>
  )
}

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
    status: "open", // Statut par défaut
    labels: [],
    assignee_id: null,
    start_date: null,
    due_date: null,
  })
  const [creatingIssue, setCreatingIssue] = useState(false)
  const [customLabelInput, setCustomLabelInput] = useState("")
  const [showCustomLabelInput, setShowCustomLabelInput] = useState(false)

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

  // Get all status labels (from columns)
  const statusLabels = useMemo(() => {
    return kanbanConfig.columns.flatMap((col) => col.labels)
  }, [])

  // Get all non-status labels
  const allNonStatusLabels = useMemo(() => {
    const labelsSet = new Set<string>()
    issues.forEach((issue) => {
      issue.labels.forEach((label) => {
        // Exclure les labels de statut
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

  // Get available columns for status selection (exclude closed if creating new issue)
  const availableColumns = useMemo(() => {
    return getSortedColumns(kanbanConfig).filter((col) => col.id !== "closed")
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

  const handleCloseNewIssueModal = useCallback(() => {
    setShowNewIssueModal(false)
    setNewIssueForm({
      title: "",
      description: "",
      status: "open",
      labels: [],
      assignee_id: null,
      start_date: null,
      due_date: null,
    })
    setCustomLabelInput("")
    setShowCustomLabelInput(false)
  }, [setCustomLabelInput, setShowCustomLabelInput])

  const handleCreateIssue = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!newIssueForm.title.trim()) {
        return
      }

      try {
        setCreatingIssue(true)

        // Construire les labels finaux
        const finalLabels = [...newIssueForm.labels]

        // Ajouter le label de statut si nécessaire
        const selectedColumn = availableColumns.find((col) => col.id === newIssueForm.status)
        if (selectedColumn && selectedColumn.matchCriteria === "labels" && selectedColumn.labels.length > 0) {
          finalLabels.push(selectedColumn.labels[0])
        }

        const newIssue = await gitlabApi.createIssue(projectId, {
          title: newIssueForm.title,
          description: newIssueForm.description || undefined,
          labels: finalLabels.length > 0 ? finalLabels : undefined,
          assignee_ids: newIssueForm.assignee_id ? [newIssueForm.assignee_id] : undefined,
          due_date: newIssueForm.due_date ? format(newIssueForm.due_date, "yyyy-MM-dd") : undefined,
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
    },
    [newIssueForm, gitlabApi, projectId, handleCloseNewIssueModal, toast, availableColumns],
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
          title: "✅ Issue supprimée",
          description: `L'issue #${issue.iid} "${issue.title}" a été supprimée avec succès`,
          variant: "default",
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erreur lors de la suppression de l'issue"
        toast({
          title: "❌ Erreur",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setDeletingIssue(false)
      }
    },
    [gitlabApi, projectId, toast],
  )

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
                      setIssueToDelete(issue)
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
                    <CalendarDays className={`w-3 h-3 ${getDueDateColor(issue.due_date).icon}`} />
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
                  {selectedIssue.due_date && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className={`w-4 h-4 ${getDueDateColor(selectedIssue.due_date).icon}`} />
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium text-sm px-2 py-1 rounded-md ${getDueDateColor(selectedIssue.due_date).textColor} ${getDueDateColor(selectedIssue.due_date).bgColor} ${getDueDateColor(selectedIssue.due_date).borderColor} border`}
                        >
                          {t.dueDate}: {new Date(selectedIssue.due_date).toLocaleDateString("fr-FR")}
                        </span>
                        <span className={`text-xs ${getDueDateColor(selectedIssue.due_date).textColor} opacity-75`}>
                          ({getDueDateLabel(selectedIssue.due_date, t)})
                        </span>
                      </div>
                    </div>
                  )}
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

  // Delete confirmation dialog
  function DeleteIssueDialog() {
    return (
      <AlertDialog open={!!issueToDelete} onOpenChange={() => setIssueToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              {t.deleteIssue}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t.deleteIssueConfirmation}</p>
              {issueToDelete && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-xs">
                      #{issueToDelete.iid}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm">{issueToDelete.title}</p>
                </div>
              )}
              <p className="text-red-600 text-sm">{t.deleteIssueWarning}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => issueToDelete && handleDeleteIssue(issueToDelete)}
              disabled={deletingIssue}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingIssue ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.deleting}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.delete}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      <NewIssueModal
        isOpen={showNewIssueModal}
        onClose={handleCloseNewIssueModal}
        onSubmit={handleCreateIssue}
        form={newIssueForm}
        setForm={setNewIssueForm}
        allAssigneesWithIds={allAssigneesWithIds}
        allNonStatusLabels={allNonStatusLabels}
        availableColumns={availableColumns}
        isCreating={creatingIssue}
        t={t}
        language={language}
      />
      <DeleteIssueDialog />
    </DndContext>
  )
}
