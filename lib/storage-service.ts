import { db } from "./database"
import { encryptToken, decryptToken } from "./crypto"

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

class StorageService {
  private initialized = false

  async init(): Promise<void> {
    if (!this.initialized) {
      await db.init()
      this.initialized = true
    }
  }

  // GitLab Configuration
  async saveGitLabConfig(config: GitLabConfiguration): Promise<void> {
    await this.init()
    const encryptedToken = encryptToken(config.token)
    await db.saveGitLabConfig(config.gitlabUrl, encryptedToken)
  }

  async getGitLabConfig(): Promise<GitLabConfiguration | null> {
    await this.init()
    const config = await db.getGitLabConfig()

    if (!config) return null

    const token = decryptToken(config.encryptedToken)
    if (!token) {
      // If decryption fails, clear the config
      await this.clearGitLabConfig()
      return null
    }

    return {
      gitlabUrl: config.gitlabUrl,
      token,
    }
  }

  async clearGitLabConfig(): Promise<void> {
    await this.init()
    await db.deleteGitLabConfig()
  }

  // Projects Management
  async saveProjects(projects: ProjectData[], selectedIds: number[] = []): Promise<void> {
    await this.init()

    const storedProjects = projects.map((project) => ({
      ...project,
      selected: selectedIds.includes(project.id),
      addedAt: new Date(),
    }))

    await db.saveProjects(storedProjects)
  }

  async getSelectedProjects(): Promise<ProjectData[]> {
    await this.init()
    const projects = await db.getSelectedProjects()
    return projects.map(({ selected, addedAt, ...project }) => project)
  }

  async getAllProjects(): Promise<{ project: ProjectData; selected: boolean; addedAt: Date }[]> {
    await this.init()
    const projects = await db.getAllProjects()
    return projects.map(({ selected, addedAt, ...project }) => ({
      project,
      selected,
      addedAt,
    }))
  }

  async updateProjectSelection(projectId: number, selected: boolean): Promise<void> {
    await this.init()
    await db.updateProjectSelection(projectId, selected)
  }

  async addProject(project: ProjectData, selected = false): Promise<void> {
    await this.init()
    const storedProject = {
      ...project,
      selected,
      addedAt: new Date(),
    }
    await db.saveProjects([storedProject])
  }

  async removeProject(projectId: number): Promise<void> {
    await this.init()
    // We don't actually delete, just mark as not selected
    await this.updateProjectSelection(projectId, false)
  }

  // User Settings
  async saveLanguage(language: string): Promise<void> {
    await this.init()
    await db.saveUserSettings({ language })
  }

  async getLanguage(): Promise<string> {
    await this.init()
    const settings = await db.getUserSettings()
    return settings?.language || "en"
  }

  async saveKanbanSettings(settings: {
    ticketsPerColumn?: number
    autoRefresh?: boolean
    refreshInterval?: number
  }): Promise<void> {
    await this.init()
    await db.saveUserSettings({ kanbanSettings: settings })
  }

  async getKanbanSettings(): Promise<{
    ticketsPerColumn?: number
    autoRefresh?: boolean
    refreshInterval?: number
  }> {
    await this.init()
    const settings = await db.getUserSettings()
    return (
      settings?.kanbanSettings || {
        ticketsPerColumn: 10,
        autoRefresh: false,
        refreshInterval: 30000,
      }
    )
  }

  // Data Management
  async clearAllData(): Promise<void> {
    await this.init()
    await db.clearAllData()
  }

  async exportData(): Promise<string> {
    await this.init()
    return await db.exportData()
  }

  // Migration from localStorage (for existing users)
  async migrateFromLocalStorage(): Promise<void> {
    try {
      // Migrate GitLab config
      const oldConfig = localStorage.getItem("gitlab_config")
      if (oldConfig) {
        const { token, gitlabUrl } = JSON.parse(oldConfig)
        await this.saveGitLabConfig({ token, gitlabUrl })
        localStorage.removeItem("gitlab_config")
      }

      // Migrate selected projects
      const oldProjects = localStorage.getItem("selected_projects")
      if (oldProjects) {
        const projects = JSON.parse(oldProjects)
        const selectedIds = projects.map((p: any) => p.id)
        await this.saveProjects(projects, selectedIds)
        localStorage.removeItem("selected_projects")
      }

      // Migrate language
      const oldLanguage = localStorage.getItem("language")
      if (oldLanguage) {
        await this.saveLanguage(oldLanguage)
        localStorage.removeItem("language")
      }
    } catch (error) {
      console.error("Migration from localStorage failed:", error)
    }
  }
}

export const storageService = new StorageService()
