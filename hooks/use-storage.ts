"use client"

import { useState, useEffect } from "react"
import { storageService, type GitLabConfiguration, type ProjectData } from "@/lib/storage-service"

export function useGitLabConfig() {
  const [config, setConfig] = useState<GitLabConfiguration | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        await storageService.migrateFromLocalStorage()
        const savedConfig = await storageService.getGitLabConfig()
        setConfig(savedConfig)
      } catch (error) {
        console.error("Failed to load GitLab config:", error)
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  const saveConfig = async (newConfig: GitLabConfiguration) => {
    try {
      await storageService.saveGitLabConfig(newConfig)
      setConfig(newConfig)
    } catch (error) {
      console.error("Failed to save GitLab config:", error)
      throw error
    }
  }

  const clearConfig = async () => {
    try {
      await storageService.clearGitLabConfig()
      setConfig(null)
    } catch (error) {
      console.error("Failed to clear GitLab config:", error)
      throw error
    }
  }

  return { config, loading, saveConfig, clearConfig }
}

export function useProjects() {
  const [selectedProjects, setSelectedProjects] = useState<ProjectData[]>([])
  const [allProjects, setAllProjects] = useState<{ project: ProjectData; selected: boolean; addedAt: Date }[]>([])
  const [loading, setLoading] = useState(true)

  const loadProjects = async () => {
    try {
      const [selected, all] = await Promise.all([storageService.getSelectedProjects(), storageService.getAllProjects()])
      setSelectedProjects(selected)
      setAllProjects(all)
    } catch (error) {
      console.error("Failed to load projects:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const addProjects = async (projects: ProjectData[], selectedIds: number[] = []) => {
    try {
      await storageService.saveProjects(projects, selectedIds)
      await loadProjects()
    } catch (error) {
      console.error("Failed to add projects:", error)
      throw error
    }
  }

  const updateProjectSelection = async (projectId: number, selected: boolean) => {
    try {
      await storageService.updateProjectSelection(projectId, selected)
      await loadProjects()
    } catch (error) {
      console.error("Failed to update project selection:", error)
      throw error
    }
  }

  const addProject = async (project: ProjectData, selected = false) => {
    try {
      await storageService.addProject(project, selected)
      await loadProjects()
    } catch (error) {
      console.error("Failed to add project:", error)
      throw error
    }
  }

  const removeProject = async (projectId: number) => {
    try {
      await storageService.removeProject(projectId)
      await loadProjects()
    } catch (error) {
      console.error("Failed to remove project:", error)
      throw error
    }
  }

  return {
    selectedProjects,
    allProjects,
    loading,
    addProjects,
    updateProjectSelection,
    addProject,
    removeProject,
    refreshProjects: loadProjects,
  }
}

export function useSettings() {
  const [kanbanSettings, setKanbanSettings] = useState({
    ticketsPerColumn: 10,
    autoRefresh: false,
    refreshInterval: 30000,
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await storageService.getKanbanSettings()
        // @ts-ignore
        setKanbanSettings(settings)
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }

    loadSettings()
  }, [])

  const updateKanbanSettings = async (newSettings: Partial<typeof kanbanSettings>) => {
    try {
      await storageService.saveKanbanSettings(newSettings)
      setKanbanSettings((prev) => ({ ...prev, ...newSettings }))
    } catch (error) {
      console.error("Failed to update settings:", error)
      throw error
    }
  }

  return {
    kanbanSettings,
    updateKanbanSettings,
  }
}
