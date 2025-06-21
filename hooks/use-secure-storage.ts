"use client"

import { useState, useEffect } from "react"
import { secureStorage, type GitLabConfiguration, type ProjectData } from "@/lib/secure-storage"

export function useGitLabConfig() {
  const [config, setConfig] = useState<GitLabConfiguration | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = secureStorage.getGitLabConfig()
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
      secureStorage.saveGitLabConfig(newConfig)
      setConfig(newConfig)
    } catch (error) {
      console.error("Failed to save GitLab config:", error)
      throw error
    }
  }

  const clearConfig = async () => {
    try {
      secureStorage.clearGitLabConfig()
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
  const [loading, setLoading] = useState(true)

  const loadProjects = () => {
    try {
      const projects = secureStorage.getSelectedProjects()
      setSelectedProjects(projects)
    } catch (error) {
      console.error("Failed to load projects:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const saveProjects = (projects: ProjectData[]) => {
    try {
      secureStorage.saveSelectedProjects(projects)
      setSelectedProjects(projects)
    } catch (error) {
      console.error("Failed to save projects:", error)
      throw error
    }
  }

  const addProject = (project: ProjectData) => {
    try {
      secureStorage.addProject(project)
      loadProjects() // Reload to get updated list
    } catch (error) {
      console.error("Failed to add project:", error)
      throw error
    }
  }

  const removeProject = (projectId: number) => {
    try {
      secureStorage.removeProject(projectId)
      loadProjects() // Reload to get updated list
    } catch (error) {
      console.error("Failed to remove project:", error)
      throw error
    }
  }

  const toggleProject = (project: ProjectData) => {
    const isSelected = selectedProjects.some((p) => p.id === project.id)
    if (isSelected) {
      removeProject(project.id)
    } else {
      addProject(project)
    }
  }

  const isProjectSelected = (projectId: number) => {
    return selectedProjects.some((p) => p.id === projectId)
  }

  return {
    selectedProjects,
    loading,
    saveProjects,
    addProject,
    removeProject,
    toggleProject,
    isProjectSelected,
    refreshProjects: loadProjects,
  }
}

export function useLanguage() {
  const [language, setLanguageState] = useState<string>("en")

  useEffect(() => {
    const savedLanguage = secureStorage.getLanguage()
    setLanguageState(savedLanguage)
  }, [])

  const setLanguage = (newLanguage: string) => {
    try {
      secureStorage.saveLanguage(newLanguage)
      setLanguageState(newLanguage)
    } catch (error) {
      console.error("Failed to save language:", error)
    }
  }

  return { language, setLanguage }
}
