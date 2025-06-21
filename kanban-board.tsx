"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Search, Filter, Plus, MoreHorizontal, Calendar } from "lucide-react"
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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

type Priority = "low" | "medium" | "high" | "urgent"
type Status = "todo" | "in-progress" | "review" | "done"

interface Ticket {
  id: string
  number: string
  title: string
  description: string
  status: Status
  priority: Priority
  assignee: {
    name: string
    avatar: string
    initials: string
  }
  dueDate: string
  tags: string[]
}

const mockTickets: Ticket[] = [
  {
    id: "1",
    number: "TASK-001",
    title: "Implement user authentication",
    description: "Add login and registration functionality with JWT tokens",
    status: "todo",
    priority: "high",
    assignee: {
      name: "Alice Johnson",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "AJ",
    },
    dueDate: "2024-01-15",
    tags: ["backend", "security"],
  },
  {
    id: "2",
    number: "TASK-002",
    title: "Design dashboard UI",
    description: "Create responsive dashboard layout with charts and widgets",
    status: "in-progress",
    priority: "medium",
    assignee: {
      name: "Bob Smith",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "BS",
    },
    dueDate: "2024-01-20",
    tags: ["frontend", "design"],
  },
  {
    id: "3",
    number: "TASK-003",
    title: "Setup CI/CD pipeline",
    description: "Configure automated testing and deployment workflows",
    status: "review",
    priority: "high",
    assignee: {
      name: "Carol Davis",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "CD",
    },
    dueDate: "2024-01-18",
    tags: ["devops", "automation"],
  },
  {
    id: "4",
    number: "TASK-004",
    title: "Write API documentation",
    description: "Document all REST API endpoints with examples",
    status: "done",
    priority: "low",
    assignee: {
      name: "David Wilson",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "DW",
    },
    dueDate: "2024-01-10",
    tags: ["documentation"],
  },
  {
    id: "5",
    number: "TASK-005",
    title: "Optimize database queries",
    description: "Improve performance of slow database operations",
    status: "todo",
    priority: "medium",
    assignee: {
      name: "Eve Brown",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "EB",
    },
    dueDate: "2024-01-25",
    tags: ["backend", "performance"],
  },
  {
    id: "6",
    number: "TASK-006",
    title: "Mobile app testing",
    description: "Test mobile application on various devices and browsers",
    status: "in-progress",
    priority: "urgent",
    assignee: {
      name: "Frank Miller",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "FM",
    },
    dueDate: "2024-01-12",
    tags: ["testing", "mobile"],
  },
]

const statusConfig = {
  todo: { label: "À faire", color: "bg-gray-100" },
  "in-progress": { label: "En cours", color: "bg-blue-100" },
  review: { label: "En révision", color: "bg-yellow-100" },
  done: { label: "Terminé", color: "bg-green-100" },
}

const priorityConfig = {
  low: { label: "Faible", color: "bg-gray-500" },
  medium: { label: "Moyen", color: "bg-blue-500" },
  high: { label: "Élevé", color: "bg-orange-500" },
  urgent: { label: "Urgent", color: "bg-red-500" },
}

export default function KanbanBoard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedAssignee, setSelectedAssignee] = useState<string>("")
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets)
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  // Get unique values for filters
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    mockTickets.forEach((ticket) => ticket.tags.forEach((tag) => tags.add(tag)))
    return Array.from(tags)
  }, [])

  const allAssignees = useMemo(() => {
    const assignees = new Set<string>()
    mockTickets.forEach((ticket) => assignees.add(ticket.assignee.name))
    return Array.from(assignees)
  }, [])

  // Filter tickets based on search and filters
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search by ticket number or title
      const matchesSearch =
        searchQuery === "" ||
        ticket.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase())

      // Filter by priority
      const matchesPriority = selectedPriorities.length === 0 || selectedPriorities.includes(ticket.priority)

      // Filter by tags
      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => ticket.tags.includes(tag))

      // Filter by assignee
      const matchesAssignee = selectedAssignee === "" || ticket.assignee.name === selectedAssignee

      return matchesSearch && matchesPriority && matchesTags && matchesAssignee
    })
  }, [tickets, searchQuery, selectedPriorities, selectedTags, selectedAssignee])

  // Group tickets by status
  const ticketsByStatus = useMemo(() => {
    const grouped: Record<Status, Ticket[]> = {
      todo: [],
      "in-progress": [],
      review: [],
      done: [],
    }

    filteredTickets.forEach((ticket) => {
      grouped[ticket.status].push(ticket)
    })

    return grouped
  }, [filteredTickets])

  const handlePriorityFilter = (priority: Priority, checked: boolean) => {
    if (checked) {
      setSelectedPriorities((prev) => [...prev, priority])
    } else {
      setSelectedPriorities((prev) => prev.filter((p) => p !== priority))
    }
  }

  const handleTagFilter = (tag: string, checked: boolean) => {
    if (checked) {
      setSelectedTags((prev) => [...prev, tag])
    } else {
      setSelectedTags((prev) => prev.filter((t) => t !== tag))
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedPriorities([])
    setSelectedTags([])
    setSelectedAssignee("")
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const ticket = tickets.find((t) => t.id === active.id)
    setActiveTicket(ticket || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTicket(null)
    if (!over) return

    const ticketId = active.id as string

    // Déterminer le nouveau statut
    const statusIds: Status[] = ["todo", "in-progress", "review", "done"]
    let newStatus: Status | null = null

    if (statusIds.includes(over.id as Status)) {
      newStatus = over.id as Status
    } else {
      const overTicket = tickets.find((t) => t.id === over.id)
      newStatus = overTicket?.status ?? null
    }

    if (!newStatus) return
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus! } : t)))
  }

  function SortableTicket({ ticket }: { ticket: Ticket }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <Card className="cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    {ticket.number}
                  </Badge>
                  <div className={`w-2 h-2 rounded-full ${priorityConfig[ticket.priority].color}`} />
                </div>
                <CardTitle className="text-sm font-medium leading-tight">{ticket.title}</CardTitle>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuCheckboxItem>Modifier</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Dupliquer</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem className="text-red-600">Supprimer</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {ticket.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(ticket.dueDate).toLocaleDateString("fr-FR")}
              </div>
              <Avatar className="w-6 h-6">
                <AvatarImage src={ticket.assignee.avatar || "/placeholder.svg"} alt={ticket.assignee.name} />
                <AvatarFallback className="text-xs">{ticket.assignee.initials}</AvatarFallback>
              </Avatar>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  function DroppableColumn({
    status,
    config,
    tickets,
    children,
  }: {
    status: Status
    config: { label: string; color: string }
    tickets: Ticket[]
    children?: React.ReactNode
  }) {
    const { setNodeRef, isOver } = useDroppable({ id: status })

    return (
      <div className="flex flex-col">
        {/* Column Header */}
        <div className={`${config.color} rounded-t-lg p-4 border-b`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">{config.label}</h3>
            <Badge variant="secondary">{tickets.length}</Badge>
          </div>
        </div>

        {/* Column Content */}
        <div
          ref={setNodeRef}
          className={`bg-white rounded-b-lg min-h-[500px] p-4 space-y-4 border border-t-0 transition-colors ${
            isOver ? "bg-blue-50 border-blue-200" : ""
          }`}
        >
          <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tickets.map((ticket) => (
              <SortableTicket key={ticket.id} ticket={ticket} />
            ))}
          </SortableContext>

          {children}
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header - garder le même contenu */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Tableau Kanban</h1>
                <p className="text-gray-600 mt-1">Gérez vos tickets et tâches efficacement</p>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau ticket
              </Button>
            </div>

            {/* Search and Filters - garder le même contenu */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par numéro de ticket ou titre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {/* Priority Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Priorité
                      {selectedPriorities.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedPriorities.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filtrer par priorité</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.entries(priorityConfig).map(([priority, config]) => (
                      <DropdownMenuCheckboxItem
                        key={priority}
                        checked={selectedPriorities.includes(priority as Priority)}
                        onCheckedChange={(checked) => handlePriorityFilter(priority as Priority, checked)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${config.color}`} />
                          {config.label}
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Tags Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Tags
                      {selectedTags.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedTags.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filtrer par tags</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {allTags.map((tag) => (
                      <DropdownMenuCheckboxItem
                        key={tag}
                        checked={selectedTags.includes(tag)}
                        onCheckedChange={(checked) => handleTagFilter(tag, checked)}
                      >
                        {tag}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Assignee Filter */}
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Assigné à" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les assignés</SelectItem>
                    {allAssignees.map((assignee) => (
                      <SelectItem key={assignee} value={assignee}>
                        {assignee}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {(searchQuery || selectedPriorities.length > 0 || selectedTags.length > 0 || selectedAssignee) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Effacer les filtres
                  </Button>
                )}
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-gray-600">
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""} trouvé
              {filteredTickets.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(statusConfig).map(([status, config]) => (
              <DroppableColumn
                key={status}
                status={status as Status}
                config={config}
                tickets={ticketsByStatus[status as Status]}
              >
                <Button variant="ghost" className="w-full border-2 border-dashed border-gray-300 h-12">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un ticket
                </Button>
              </DroppableColumn>
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTicket ? (
          <Card className="cursor-grabbing shadow-lg rotate-3">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {activeTicket.number}
                    </Badge>
                    <div className={`w-2 h-2 rounded-full ${priorityConfig[activeTicket.priority].color}`} />
                  </div>
                  <CardTitle className="text-sm font-medium leading-tight">{activeTicket.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{activeTicket.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {activeTicket.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(activeTicket.dueDate).toLocaleDateString("fr-FR")}
                </div>
                <Avatar className="w-6 h-6">
                  <AvatarImage
                    src={activeTicket.assignee.avatar || "/placeholder.svg"}
                    alt={activeTicket.assignee.name}
                  />
                  <AvatarFallback className="text-xs">{activeTicket.assignee.initials}</AvatarFallback>
                </Avatar>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
