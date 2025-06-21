import { encryptToken, decryptToken } from "@/lib/crypto";

export interface GitLabConfiguration {
  gitlabUrl: string
  token: string
}

export interface ProjectData {
  id: number
  name: string
  name_with_namespace: string
  description: string
  web_url: string
  last_activity_at: string
  star_count: number
  forks_count: number
}

class SecureStorageService {
  private readonly GITLAB_CONFIG_KEY = "gitlab_config_secure"
  private readonly PROJECTS_KEY = "selected_projects"
  private readonly LANGUAGE_KEY = "app_language"

  // GitLab Configuration (encrypted)
  saveGitLabConfig(config: GitLabConfiguration): void {
    try {
      const encryptedToken = encryptToken(config.token)
      const secureConfig = {
        gitlabUrl: config.gitlabUrl,
        encryptedToken,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(this.GITLAB_CONFIG_KEY, JSON.stringify(secureConfig))
    } catch (error) {
      console.error("Failed to save GitLab config:", error)
      throw new Error("Failed to save configuration")
    }
  }

  getGitLabConfig(): GitLabConfiguration | null {
    try {
      const stored = localStorage.getItem(this.GITLAB_CONFIG_KEY)
      if (!stored) return null

      const secureConfig = JSON.parse(stored)
      const token = decryptToken(secureConfig.encryptedToken)

      if (!token) {
        // If decryption fails, clear the config
        this.clearGitLabConfig()
        return null
      }

      return {
        gitlabUrl: secureConfig.gitlabUrl,
        token,
      }
    } catch (error) {
      console.error("Failed to load GitLab config:", error)
      return null
    }
  }

  clearGitLabConfig(): void {
    localStorage.removeItem(this.GITLAB_CONFIG_KEY)
  }

  // Projects (localStorage)
  saveSelectedProjects(projects: ProjectData[]): void {
    try {
      const projectsData = {
        projects,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projectsData))
    } catch (error) {
      console.error("Failed to save projects:", error)
      throw new Error("Failed to save projects")
    }
  }

  getSelectedProjects(): ProjectData[] {
    try {
      const stored = localStorage.getItem(this.PROJECTS_KEY)
      if (!stored) return []

      const projectsData = JSON.parse(stored)
      return projectsData.projects || []
    } catch (error) {
      console.error("Failed to load projects:", error)
      return []
    }
  }

  addProject(project: ProjectData): void {
    const currentProjects = this.getSelectedProjects()
    const exists = currentProjects.find((p) => p.id === project.id)

    if (!exists) {
      const updatedProjects = [...currentProjects, project]
      this.saveSelectedProjects(updatedProjects)
    }
  }

  removeProject(projectId: number): void {
    const currentProjects = this.getSelectedProjects()
    const updatedProjects = currentProjects.filter((p) => p.id !== projectId)
    this.saveSelectedProjects(updatedProjects)
  }

  clearProjects(): void {
    localStorage.removeItem(this.PROJECTS_KEY)
  }

  // Language
  saveLanguage(language: string): void {
    localStorage.setItem(this.LANGUAGE_KEY, language)
  }

  getLanguage(): string {
    return localStorage.getItem(this.LANGUAGE_KEY) || "en"
  }

  // Utility
  clearAllData(): void {
    this.clearGitLabConfig()
    this.clearProjects()
    localStorage.removeItem(this.LANGUAGE_KEY)
  }

  exportData(): string {
    const config = this.getGitLabConfig()
    const projects = this.getSelectedProjects()
    const language = this.getLanguage()

    return JSON.stringify(
      {
        config: config ? { ...config, token: "[ENCRYPTED]" } : null, // Don't export the actual token
        projects,
        language,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    )
  }

  // Check if data exists (for migration purposes)
  hasData(): boolean {
    return !!(
      localStorage.getItem(this.GITLAB_CONFIG_KEY) ||
      localStorage.getItem(this.PROJECTS_KEY) ||
      localStorage.getItem(this.LANGUAGE_KEY)
    )
  }
}

export const secureStorage = new SecureStorageService()
