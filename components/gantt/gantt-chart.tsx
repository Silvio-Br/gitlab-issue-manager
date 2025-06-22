"use client"

import type React from "react"

import { useState, useMemo, useEffect, useRef } from "react"
import {GitlabIcon as GitLab, Filter, Search, AlertCircle, User, GitlabIcon} from "lucide-react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInDays,
  parseISO,
  isSameMonth,
  startOfDay,
} from "date-fns"
import { fr, enUS } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

import { GitLabAPI } from "@/lib/gitlab-api"
import type { GitLabIssue, GitLabProject } from "@/types/gitlab"
import { kanbanConfig, getIssueColumn } from "@/config/kanban-config"
import { useLanguage } from "@/contexts/language-context"
import { IssueDetailModal } from "@/components/kanban/issue-detail-modal"
import { IssueModal } from "@/components/kanban/issue-modal"

interface GanttChartProps {
  projectId: string
  gitlabToken?: string
  gitlabUrl?: string
  onRefreshReady?: (refreshFn: () => Promise<void>) => void
}

interface GanttIssue extends GitLabIssue {
  startDate: Date
  endDate: Date
  duration: number
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

export default function GanttChart({ projectId, gitlabToken, gitlabUrl, onRefreshReady }: GanttChartProps) {
  const [issues, setIssues] = useState<GitLabIssue[]>([])
  const [project, setProject] = useState<GitLabProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedIssue, setSelectedIssue] = useState<GitLabIssue | null>(null)
  const [editingIssue, setEditingIssue] = useState<GitLabIssue | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [issueForm, setIssueForm] = useState<IssueForm>({
    title: "",
    description: "",
    status: "",
    labels: [],
    assignee_id: null,
    start_date: null,
    due_date: null,
  })

  // Refs for scroll synchronization
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const contentScrollRef = useRef<HTMLDivElement>(null)

  const gitlabApi = useMemo(() => new GitLabAPI(gitlabToken, gitlabUrl), [gitlabToken, gitlabUrl])
  const { t, language } = useLanguage()
  const { toast } = useToast()

  // Synchronize scroll between header and content
  const handleHeaderScroll = () => {
    if (headerScrollRef.current && contentScrollRef.current) {
      contentScrollRef.current.scrollLeft = headerScrollRef.current.scrollLeft
    }
  }

  const handleContentScroll = () => {
    if (headerScrollRef.current && contentScrollRef.current) {
      headerScrollRef.current.scrollLeft = contentScrollRef.current.scrollLeft
    }
  }

  // Load project data
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
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error)
    } finally {
      setLoading(false)
    }
  }

  // Refresh function for external use
  const refreshData = async () => {
    await loadProjectData()
  }

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
  }, [projectId, gitlabApi, t.error])

  // Register refresh function with parent
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(refreshData)
    }
  }, [onRefreshReady])

  // Filter issues that have both start_date and due_date
  const ganttIssues = useMemo((): GanttIssue[] => {
    return issues
      .filter((issue) => issue.start_date && issue.due_date)
      .map((issue) => {
        const startDate = parseISO(issue.start_date!)
        const endDate = parseISO(issue.due_date!)
        const duration = differenceInDays(endDate, startDate) + 1

        return {
          ...issue,
          startDate,
          endDate,
          duration,
        }
      })
      .filter((issue) => {
        const matchesSearch =
          searchQuery === "" ||
          issue.iid.toString().includes(searchQuery) ||
          issue.title.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesLabels =
          selectedLabels.length === 0 || selectedLabels.some((label) => issue.labels.includes(label))

        const matchesAssignee =
          selectedAssignee === "all" || issue.assignees.some((assignee) => assignee.name === selectedAssignee)

        const matchesStatus = selectedStatus === "all" || getIssueColumn(issue, kanbanConfig) === selectedStatus

        return matchesSearch && matchesLabels && matchesAssignee && matchesStatus
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }, [issues, searchQuery, selectedLabels, selectedAssignee, selectedStatus])

  // Get all non-status labels
  const allNonStatusLabels = useMemo(() => {
    const statusLabels = kanbanConfig.columns.flatMap((col) => col.labels)
    const labelsSet = new Set<string>()
    issues.forEach((issue) => {
      issue.labels.forEach((label) => {
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
  }, [issues])

  // Get all assignees with IDs
  const allAssigneesWithIds = useMemo(() => {
    const assigneesMap = new Map()
    issues.forEach((issue) => {
      issue.assignees.forEach((assignee) => {
        if (!assigneesMap.has(assignee.id)) {
          assigneesMap.set(assignee.id, assignee)
        }
      })
    })
    return Array.from(assigneesMap.values())
  }, [issues])

  // Get all assignees names
  const allAssignees = useMemo(() => {
    const assignees = new Set<string>()
    issues.forEach((issue) => issue.assignees.forEach((assignee) => assignees.add(assignee.name)))
    return Array.from(assignees)
  }, [issues])

  // Get available statuses
  const availableStatuses = useMemo(() => {
    return kanbanConfig.columns.map((col) => ({ id: col.id, name: col.name, emoji: col.emoji }))
  }, [])

  // Calculate timeline bounds based on visible issues
  const timelineBounds = useMemo(() => {
    if (ganttIssues.length === 0) {
      const now = new Date()
      return { start: startOfMonth(now), end: endOfMonth(now) }
    }

    const earliestStart = ganttIssues.reduce(
      (earliest, issue) => (issue.startDate < earliest ? issue.startDate : earliest),
      ganttIssues[0].startDate,
    )
    const latestEnd = ganttIssues.reduce(
      (latest, issue) => (issue.endDate > latest ? issue.endDate : latest),
      ganttIssues[0].endDate,
    )

    return { start: earliestStart, end: latestEnd }
  }, [ganttIssues])

  const timelineDays = eachDayOfInterval(timelineBounds)

  // Group timeline days by month for header display
  const timelineMonths = useMemo(() => {
    const months: Array<{ month: Date; days: Date[]; startIndex: number }> = []
    let currentMonth: Date | null = null
    let currentDays: Date[] = []
    let startIndex = 0

    timelineDays.forEach((day, index) => {
      if (!currentMonth || !isSameMonth(day, currentMonth)) {
        if (currentMonth && currentDays.length > 0) {
          months.push({ month: currentMonth, days: currentDays, startIndex })
        }
        currentMonth = startOfDay(day)
        currentDays = [day]
        startIndex = index
      } else {
        currentDays.push(day)
      }
    })

    if (currentMonth && currentDays.length > 0) {
      months.push({ month: currentMonth, days: currentDays, startIndex })
    }

    return months
  }, [timelineDays])

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
    setSelectedStatus("all")
  }

  const handleIssueClick = (issue: GitLabIssue) => {
    setSelectedIssue(issue)
  }

  const handleEditIssue = (issue: GitLabIssue) => {
    // Fermer la modale de détail
    setSelectedIssue(null)

    // Préparer le formulaire d'édition
    const statusLabels = kanbanConfig.columns.flatMap((col) => col.labels)
    const nonStatusLabels = issue.labels.filter(
      (label) =>
        !statusLabels.some(
          (statusLabel) =>
            label.toLowerCase().includes(statusLabel.toLowerCase()) ||
            statusLabel.toLowerCase().includes(label.toLowerCase()),
        ),
    )

    setIssueForm({
      title: issue.title,
      description: issue.description || "",
      status: getIssueColumn(issue, kanbanConfig),
      labels: nonStatusLabels,
      assignee_id: issue.assignees.length > 0 ? issue.assignees[0].id : null,
      start_date: issue.start_date ? parseISO(issue.start_date) : null,
      due_date: issue.due_date ? parseISO(issue.due_date) : null,
    })

    setEditingIssue(issue)
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingIssue) return

    try {
      setIsSubmitting(true)

      // Construire les labels finaux (status + autres labels)
      const statusColumn = kanbanConfig.columns.find((col) => col.id === issueForm.status)
      const statusLabels = statusColumn?.labels || []
      const finalLabels = [...statusLabels, ...issueForm.labels]

      // Préparer les données de mise à jour
      const updateData: any = {
        title: issueForm.title,
        description: issueForm.description,
        labels: finalLabels.join(","),
      }

      if (issueForm.assignee_id) {
        updateData.assignee_ids = [issueForm.assignee_id]
      } else {
        updateData.assignee_ids = []
      }

      if (issueForm.start_date) {
        updateData.start_date = format(issueForm.start_date, "yyyy-MM-dd")
      }

      if (issueForm.due_date) {
        updateData.due_date = format(issueForm.due_date, "yyyy-MM-dd")
      }

      // Mettre à jour l'issue
      const updatedIssue = await gitlabApi.updateIssue(projectId, editingIssue.iid, updateData)

      // Mettre à jour la liste locale
      // @ts-ignore
      setIssues((prev) => prev.map((issue) => (issue.id === editingIssue.id ? { ...issue, ...updatedIssue } : issue)))

      toast({
        title: t.success,
        description: t.issueUpdated,
      })

      // Fermer la modale d'édition
      setEditingIssue(null)
      setIssueForm({
        title: "",
        description: "",
        status: "",
        labels: [],
        assignee_id: null,
        start_date: null,
        due_date: null,
      })
    } catch (err) {
      console.error("Error updating issue:", err)
      toast({
        title: t.error,
        description: err instanceof Error ? err.message : t.errorUpdatingIssue,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
    <div className="h-full bg-gray-50 flex flex-col">
      <style jsx>{`
      .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
    `}</style>

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
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        {status.emoji && <span>{status.emoji}</span>}
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
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

              {(searchQuery || selectedLabels.length > 0 || selectedAssignee !== "all" || selectedStatus !== "all") && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t.clearFilters}
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            {ganttIssues.length} {ganttIssues.length !== 1 ? t.issuesFound : t.issueFound} {t.withDates}
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        {ganttIssues.length === 0 ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center">
              <div className="w-16 h-16 text-gray-400 mx-auto mb-4 flex items-center justify-center">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={project?.avatar_url || "/placeholder.svg"} alt={project?.name} />
                  <AvatarFallback>
                    <GitLab className="w-8 h-8 text-orange-500" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">{t.noIssuesWithDates}</h3>
              <p className="text-gray-500">{t.noIssuesWithDatesDescription}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0 pb-4">
              <CardTitle className="text-lg">
                {t.timeline} - {format(timelineBounds.start, "MMM yyyy", { locale: language === "fr" ? fr : enUS })}{" "}
                {t.to} {format(timelineBounds.end, "MMM yyyy", { locale: language === "fr" ? fr : enUS })}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <div className="h-full flex flex-col">
                {/* Timeline Header - Fixed */}
                <div className="flex-shrink-0 border-b bg-gray-50 sticky top-0 z-20">
                  <div className="flex">
                    {/* Task column header */}
                    <div className="w-80 p-3 border-r bg-white flex-shrink-0">
                      <span className="font-medium text-sm text-gray-700">{t.tasks}</span>
                    </div>
                    {/* Timeline header - Scrollable */}
                    <div
                      className="flex-1 overflow-x-auto hide-scrollbar"
                      ref={headerScrollRef}
                      onScroll={handleHeaderScroll}
                    >
                      <div className="flex flex-col" style={{ minWidth: `${timelineDays.length * 40}px` }}>
                        {/* Month headers */}
                        <div className="flex border-b">
                          {timelineMonths.map((monthGroup) => (
                            <div
                              key={monthGroup.month.toISOString()}
                              className="border-r bg-gray-100 flex items-center justify-center py-2 text-sm font-medium text-gray-700"
                              style={{ width: `${monthGroup.days.length * 40}px` }}
                            >
                              {format(monthGroup.month, "MMM yyyy", { locale: language === "fr" ? fr : enUS })}
                            </div>
                          ))}
                        </div>
                        {/* Day headers */}
                        <div className="flex">
                          {timelineDays.map((day) => (
                            <div key={day.toISOString()} className="w-10 p-2 border-r text-center flex-shrink-0">
                              <div className="text-xs text-gray-500">
                                {format(day, "dd", { locale: language === "fr" ? fr : enUS })}
                              </div>
                              <div className="text-xs text-gray-400">
                                {format(day, "EEE", { locale: language === "fr" ? fr : enUS })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tasks - Scrollable */}
                <div className="flex-1 overflow-auto hide-scrollbar">
                  <div className="flex">
                    {/* Task info column - Fixed */}
                    <div className="w-80 flex-shrink-0 bg-white border-r">
                      {ganttIssues.map((issue) => {
                        const columnInfo = kanbanConfig.columns.find(
                          (col) => getIssueColumn(issue, kanbanConfig) === col.id,
                        ) || { name: t.unassigned, color: "#6b7280", emoji: "" }

                        return (
                          <div
                            key={issue.id}
                            className="p-2 border-b hover:bg-gray-50 transition-colors h-12 flex items-center cursor-pointer"
                            onClick={() => handleIssueClick(issue)}
                          >
                            <div className="flex items-center gap-2 w-full min-w-0">
                              {/* Issue number and status indicator */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Badge variant="outline" className="text-xs font-mono px-1 py-0">
                                  #{issue.iid}
                                </Badge>
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: columnInfo.color }}
                                />
                                {issue.state === "closed" && (
                                  <Badge variant="secondary" className="text-xs px-1 py-0">
                                    ✓
                                  </Badge>
                                )}
                              </div>

                              {/* Title - truncated */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-medium truncate" title={issue.title}>
                                  {issue.title}
                                </h4>
                              </div>

                              {/* Assignees */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {issue.assignees.length > 0 ? (
                                  issue.assignees.slice(0, 2).map((assignee) => (
                                    <Avatar key={assignee.id} className="w-4 h-4">
                                      <AvatarImage
                                        src={assignee.avatar_url || "/placeholder.svg"}
                                        alt={assignee.name}
                                      />
                                      <AvatarFallback className="text-xs">
                                        {assignee.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .substring(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))
                                ) : (
                                  <User className="w-3 h-3 text-gray-400" />
                                )}
                                {issue.assignees.length > 2 && (
                                  <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                    +{issue.assignees.length - 2}
                                  </div>
                                )}
                              </div>

                              {/* Duration */}
                              <div className="text-xs text-gray-500 flex-shrink-0">
                                {differenceInDays(parseISO(issue.due_date!), parseISO(issue.start_date!)) + 1}d
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Timeline content - Scrollable */}
                    <div
                      className="flex-1 relative overflow-x-auto hide-scrollbar"
                      ref={contentScrollRef}
                      onScroll={handleContentScroll}
                    >
                      <div
                        className="relative"
                        style={{ minWidth: `${timelineDays.length * 40}px`, height: `${ganttIssues.length * 48}px` }}
                      >
                        {/* Vertical grid lines - Fixed positioning */}
                        <div className="absolute inset-0 flex pointer-events-none z-0">
                          {timelineDays.map((day, index) => (
                            <div
                              key={day.toISOString()}
                              className={`w-10 border-r h-full ${index % 7 === 0 || index % 7 === 6 ? "bg-gray-50" : ""}`}
                            />
                          ))}
                        </div>

                        {/* Horizontal grid lines */}
                        <div className="absolute inset-0 pointer-events-none z-0">
                          {ganttIssues.map((_, index) => (
                            <div
                              key={index}
                              className="absolute w-full border-b border-gray-200"
                              style={{ top: `${(index + 1) * 48}px` }}
                            />
                          ))}
                        </div>

                        {/* Task bars */}
                        {ganttIssues.map((issue, index) => {
                          const startDate = parseISO(issue.start_date!)
                          const endDate = parseISO(issue.due_date!)
                          const duration = differenceInDays(endDate, startDate) + 1
                          const dayWidth = 40
                          const startOffset = differenceInDays(startDate, timelineBounds.start)
                          const taskWidth = duration * dayWidth
                          const columnInfo = kanbanConfig.columns.find(
                            (col) => getIssueColumn(issue, kanbanConfig) === col.id,
                          ) || { name: t.unassigned, color: "#6b7280", emoji: "" }

                          return (
                            <div
                              key={issue.id}
                              className="absolute h-12 flex items-center hover:bg-gray-50/50 transition-colors z-10"
                              style={{
                                top: `${index * 48}px`,
                                width: "100%",
                              }}
                            >
                              <div
                                className="h-6 rounded cursor-pointer transition-all hover:h-7 hover:shadow-md flex items-center justify-center px-2 relative"
                                style={{
                                  left: `${Math.max(0, startOffset * dayWidth)}px`,
                                  width: `${taskWidth}px`,
                                  backgroundColor: `${columnInfo.color}40`,
                                  border: `2px solid ${columnInfo.color}`,
                                  minWidth: "60px",
                                }}
                                title={`#${issue.iid} - ${issue.title}\n${format(startDate, "dd/MM/yyyy")} → ${format(endDate, "dd/MM/yyyy")} (${duration}d)`}
                                onClick={() => handleIssueClick(issue)}
                              >
                                <span className="text-xs font-medium text-gray-700 truncate">#{issue.iid}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          columns={kanbanConfig.columns.map(({ id, name, color }) => ({ id, name, color }))}
          onClose={() => setSelectedIssue(null)}
          onEdit={() => handleEditIssue(selectedIssue)}
          customLinkComponent={({ href, children, ...rest }: any) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-600 hover:text-blue-800"
              {...rest}
            >
              {children}
            </a>
          )}
          customImageComponent={(props: any) => <img {...props} className="max-w-full h-auto" />}
        />
      )}

      {/* Issue Edit Modal */}
      {editingIssue && (
        <IssueModal
          isOpen={!!editingIssue}
          onClose={() => {
            setEditingIssue(null)
            setIssueForm({
              title: "",
              description: "",
              status: "",
              labels: [],
              assignee_id: null,
              start_date: null,
              due_date: null,
            })
          }}
          onSubmit={handleSubmitEdit}
          form={issueForm}
          setForm={setIssueForm}
          allAssigneesWithIds={allAssigneesWithIds}
          allNonStatusLabels={allNonStatusLabels}
          availableColumns={kanbanConfig.columns}
          isSubmitting={isSubmitting}
          mode="edit"
          issue={editingIssue}
        />
      )}
    </div>
  )
}
