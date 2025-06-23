"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  GitlabIcon as GitLab,
  LayoutGrid,
  Plus,
  Settings,
  FolderOpen,
  BarChart3,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import GitLabKanbanBoard from "../gitlab-kanban-board"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSelector } from "@/components/language-selector"
import { useGitLabConfig, useProjects } from "@/hooks/use-secure-storage"
import type { ProjectData } from "@/lib/storage-service"
import GanttChart from "@/components/gantt/gantt-chart"
import { useToast } from "@/hooks/use-toast"

type ViewType = "kanban" | "gantt"

export default function DashboardPage() {
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null)
  const [currentView, setCurrentView] = useState<ViewType>("kanban")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const kanbanRefreshRef = useRef<(() => Promise<void>) | null>(null)
  const ganttRefreshRef = useRef<(() => Promise<void>) | null>(null)
  const router = useRouter()
  const { t } = useLanguage()
  const { config: gitlabConfig, loading: configLoading } = useGitLabConfig()
  const { selectedProjects, loading: projectsLoading, removeProject } = useProjects()
  const { toast } = useToast()

  useEffect(() => {
    // Redirect to configuration if no GitLab config
    if (!configLoading && !gitlabConfig) {
      router.push("/")
      return
    }

    // Redirect to projects if no selected projects
    if (!projectsLoading && selectedProjects.length === 0) {
      router.push("/projects")
      return
    }

    // Select first project by default
    if (selectedProjects.length > 0 && !currentProject) {
      setCurrentProject(selectedProjects[0])
    }
  }, [configLoading, gitlabConfig, projectsLoading, selectedProjects, currentProject, router])

  const handleAddProject = () => {
    router.push("/projects")
  }

  const handleReconfigure = () => {
    router.push("/?reconfigure=true")
  }

  const handleRemoveProject = (projectToRemove: ProjectData) => {
    try {
      removeProject(projectToRemove.id)

      // If removed project was selected, select first available
      if (currentProject?.id === projectToRemove.id) {
        const remainingProjects = selectedProjects.filter((p) => p.id !== projectToRemove.id)
        setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0] : null)
      }
    } catch (error) {
      console.error("Failed to remove project:", error)
    }
  }

  const handleRefresh = async () => {
    if (!currentProject) return

    setIsRefreshing(true)
    try {
      // Call the appropriate refresh function based on current view
      if (currentView === "kanban" && kanbanRefreshRef.current) {
        await kanbanRefreshRef.current()
      } else if (currentView === "gantt" && ganttRefreshRef.current) {
        await ganttRefreshRef.current()
      }

      toast({
        title: t.success || "Success",
        description: t.dataRefreshed,
      })
    } catch (error) {
      toast({
        title: t.error,
        description: t.refreshError,
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  if (configLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>{t.loading}</p>
        </div>
      </div>
    )
  }

  if (!gitlabConfig || selectedProjects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>{t.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Vertical sidebar - Collapsible */}
      <div
        className={`${sidebarCollapsed ? "w-16" : "w-80"} h-full bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative`}
      >
        {/* Toggle button - Better positioned */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 z-10 h-6 w-6 p-0 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md"
        >
          {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </Button>

        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <GitLab className="w-8 h-8 text-orange-500" />
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-gray-900">GitLab Manager</h1>
                <p className="text-sm text-gray-500">{t.projectManagement}</p>
              </div>
            )}
          </div>
        </div>

        {/* Views navigation */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          {!sidebarCollapsed && <h3 className="text-sm font-medium text-gray-700 mb-3">{t.views}</h3>}
          <div className="space-y-1">
            <Button
              variant={currentView === "kanban" ? "secondary" : "ghost"}
              className={`${sidebarCollapsed ? "w-8 h-8 p-0" : "w-full justify-start"}`}
              onClick={() => setCurrentView("kanban")}
              title={sidebarCollapsed ? t.kanban : undefined}
            >
              <LayoutGrid className="w-4 h-4" />
              {!sidebarCollapsed && <span className="ml-2">{t.kanban}</span>}
            </Button>
            <Button
              variant={currentView === "gantt" ? "secondary" : "ghost"}
              className={`${sidebarCollapsed ? "w-8 h-8 p-0" : "w-full justify-start"}`}
              onClick={() => setCurrentView("gantt")}
              title={sidebarCollapsed ? t.gantt : undefined}
            >
              <BarChart3 className="w-4 h-4" />
              {!sidebarCollapsed && <span className="ml-2">{t.gantt}</span>}
            </Button>
          </div>
        </div>

        {/* Projects list - Scrollable */}
        {!sidebarCollapsed && (
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-sm font-medium text-gray-700">
                {t.projects} ({selectedProjects.length})
              </h3>
              <Button size="sm" variant="outline" onClick={handleAddProject}>
                <Plus className="w-3 h-3 mr-1" />
                {t.addProject}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {selectedProjects.map((project) => (
                <Card
                  key={project.id}
                  className={`cursor-pointer transition-all hover:shadow-sm group ${
                    currentProject?.id === project.id ? "ring-2 ring-blue-500 bg-blue-50" : ""
                  }`}
                  onClick={() => setCurrentProject(project)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{project.name}</h4>
                        <p className="text-xs text-gray-500 truncate">{project.name_with_namespace}</p>
                        {project.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{project.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveProject(project)
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        ⭐ {project.star_count}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        🍴 {project.forks_count}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed projects indicator */}
        {sidebarCollapsed && selectedProjects.length > 0 && (
          <div className="flex-1 p-2 flex flex-col items-center justify-center">
            <div className="text-center">
              <FolderOpen className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <div className="text-xs text-gray-500 font-medium">{selectedProjects.length}</div>
              {currentProject && <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-1" />}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className={`${sidebarCollapsed ? "w-8 h-8 p-0" : "w-full"}`}
            onClick={handleAddProject}
            title={sidebarCollapsed ? t.manageProjects : undefined}
          >
            <FolderOpen className="w-4 h-4" />
            {!sidebarCollapsed && <span className="ml-2">{t.manageProjects}</span>}
          </Button>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            className={`${sidebarCollapsed ? "w-8 h-8 p-0" : "w-full"}`}
            onClick={handleRefresh}
            disabled={isRefreshing || !currentProject}
            title={sidebarCollapsed ? t.refresh : undefined}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {!sidebarCollapsed && <span className="ml-2">{t.refresh}</span>}
          </Button>

          {/* Language selector */}
          <LanguageSelector variant="sidebar" collapsed={sidebarCollapsed} />

          <Button
            variant="outline"
            size="sm"
            className={`${sidebarCollapsed ? "w-8 h-8 p-0" : "w-full"}`}
            onClick={handleReconfigure}
            title={sidebarCollapsed ? t.reconfiguration : undefined}
          >
            <Settings className="w-4 h-4" />
            {!sidebarCollapsed && <span className="ml-2">{t.reconfiguration}</span>}
          </Button>
        </div>
      </div>

      {/* Main content - Takes remaining space */}
      <div className="flex-1 h-full min-w-0 overflow-hidden">
        {currentProject ? (
          <>
            {currentView === "kanban" && (
              <GitLabKanbanBoard
                projectId={currentProject.id.toString()}
                gitlabToken={gitlabConfig.token}
                gitlabUrl={gitlabConfig.gitlabUrl}
                onRefreshReady={(refreshFn) => {
                  kanbanRefreshRef.current = refreshFn
                }}
              />
            )}
            {currentView === "gantt" && (
              <GanttChart
                projectId={currentProject.id.toString()}
                gitlabToken={gitlabConfig.token}
                gitlabUrl={gitlabConfig.gitlabUrl}
                onRefreshReady={(refreshFn) => {
                  ganttRefreshRef.current = refreshFn
                }}
              />
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div>
              <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-700 mb-2">{t.noProjectSelected}</h2>
              <p className="text-gray-500 mb-4">{t.selectProjectFromSidebar}</p>
              <Button onClick={handleAddProject}>
                <Plus className="w-4 h-4 mr-2" />
                {t.addProject} {t.projects.toLowerCase()}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
