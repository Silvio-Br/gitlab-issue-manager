"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { GitlabIcon as GitLab, Search, ArrowRight, ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GitLabAPI } from "@/lib/gitlab-api"
import { useLanguage } from "@/contexts/language-context"
import { useGitLabConfig, useProjects } from "@/hooks/use-secure-storage"
import type { ProjectData } from "@/lib/storage-service"

export default function ProjectsPage() {
  const [availableProjects, setAvailableProjects] = useState<ProjectData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { t } = useLanguage()
  const { config: gitlabConfig, loading: configLoading } = useGitLabConfig()
  const { selectedProjects, addProject, removeProject } =
    useProjects()

  const gitlabApi = useMemo(() => {
    if (!gitlabConfig) return null
    return new GitLabAPI(gitlabConfig.token, gitlabConfig.gitlabUrl)
  }, [gitlabConfig])

  useEffect(() => {
    if (!configLoading && !gitlabConfig) {
      router.push("/")
      return
    }
  }, [configLoading, gitlabConfig, router])

  useEffect(() => {
    const loadProjects = async () => {
      if (!gitlabApi) return

      try {
        setLoading(true)
        setError(null)

        // Load user's projects from GitLab
        const response = await fetch(
          `${gitlabApi.baseUrl || "https://gitlab.com/api/v4"}/projects?membership=true&per_page=50&order_by=last_activity_at`,
          {
            headers: {
              "PRIVATE-TOKEN": gitlabApi.token || "",
            },
          },
        )

        if (!response.ok) {
          throw new Error("Error loading projects")
        }

        const projectsData = await response.json()
        setAvailableProjects(projectsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    if (gitlabApi) {
      loadProjects()
    }
  }, [gitlabApi])

  const filteredProjects = useMemo(() => {
    return availableProjects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.name_with_namespace.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase())),
    )
  }, [availableProjects, searchQuery])

  const handleProjectToggle = (project: ProjectData, checked: boolean) => {
    try {
      if (checked) {
        addProject(project)
      } else {
        removeProject(project.id)
      }
    } catch (error) {
      console.error("Failed to update project selection:", error)
    }
  }

  const handleContinue = () => {
    router.push("/dashboard")
  }

  const handleBack = () => {
    router.push("/")
  }

  const isProjectSelected = (projectId: number) => {
    return selectedProjects.some((p) => p.id === projectId)
  }

  if (configLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <GitLab className="w-8 h-8 text-orange-500" />
                {t.selectProjects}
              </h1>
              <p className="text-gray-600 mt-1">Choose the GitLab projects you want to manage</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleContinue} disabled={selectedProjects.length === 0}>
                {t.continue} ({selectedProjects.length})
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {selectedProjects.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                {t.selectedProjects} ({selectedProjects.length}):
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedProjects.map((project) => (
                  <Badge key={project.id} variant="secondary">
                    {project.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const isSelected = isProjectSelected(project.id)
            return (
              <Card
                key={project.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""
                }`}
                onClick={() => handleProjectToggle(project, !isSelected)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-medium leading-tight flex items-center gap-2">
                        <Checkbox checked={isSelected} />
                        {project.name}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{project.name_with_namespace}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span>⭐ {project.star_count}</span>
                      <span>🍴 {project.forks_count}</span>
                    </div>
                    <span>{new Date(project.last_activity_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No projects found</p>
          </div>
        )}
      </div>
    </div>
  )
}
