"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GitlabIcon as GitLab, LayoutGrid, Plus, Settings, FolderOpen, BarChart3, X } from "lucide-react"
import { useRouter } from "next/navigation"
import GitLabKanbanBoard from "../gitlab-kanban-board"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSelector } from "@/components/language-selector"
import { useGitLabConfig, useProjects } from "@/hooks/use-secure-storage"
import type { ProjectData } from "@/lib/storage-service"

type ViewType = "kanban" | "gantt"

export default function DashboardPage() {
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null)
  const [currentView, setCurrentView] = useState<ViewType>("kanban")
  const router = useRouter()
  const { t } = useLanguage()
  const { config: gitlabConfig, loading: configLoading } = useGitLabConfig()
  const { selectedProjects, loading: projectsLoading, removeProject } = useProjects()

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
      {/* Vertical sidebar - Fixed size */}
      <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <GitLab className="w-8 h-8 text-orange-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">GitLab Manager</h1>
              <p className="text-sm text-gray-500">{t.projectManagement}</p>
            </div>
          </div>
        </div>

        {/* Language selector */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <LanguageSelector />
        </div>

        {/* Views navigation */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t.views}</h3>
          <div className="space-y-1">
            <Button
              variant={currentView === "kanban" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setCurrentView("kanban")}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              {t.kanban}
            </Button>
            <Button
              variant={currentView === "gantt" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setCurrentView("gantt")}
              disabled
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {t.ganttComingSoon}
            </Button>
          </div>
        </div>

        {/* Projects list - Scrollable */}
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

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="w-full" onClick={handleAddProject}>
            <FolderOpen className="w-4 h-4 mr-2" />
            {t.manageProjects}
          </Button>
          <Button variant="outline" size="sm" className="w-full" onClick={handleReconfigure}>
            <Settings className="w-4 h-4 mr-2" />
            {t.reconfiguration}
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
              />
            )}
            {currentView === "gantt" && (
              <div className="h-full flex items-center justify-center">
                <div>
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-700 mb-2">{t.gantt}</h2>
                  <p className="text-gray-500">{t.ganttDescription}</p>
                </div>
              </div>
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
