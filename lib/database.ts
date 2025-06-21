interface GitLabConfig {
  id: string
  gitlabUrl: string
  encryptedToken: string
  createdAt: Date
  updatedAt: Date
}

interface StoredProject {
  id: number
  name: string
  name_with_namespace: string
  description: string
  web_url: string
  last_activity_at: string
  star_count: number
  forks_count: number
  selected: boolean
  addedAt: Date
}

interface UserSettings {
  id: string
  language: string
  theme: string
  kanbanSettings: {
    ticketsPerColumn: number
    autoRefresh: boolean
    refreshInterval: number
  }
  updatedAt: Date
}

class DatabaseManager {
  private db: IDBDatabase | null = null
  private readonly dbName = "GitLabKanbanDB"
  private readonly dbVersion = 1

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // GitLab configuration store
        if (!db.objectStoreNames.contains("gitlabConfig")) {
          const configStore = db.createObjectStore("gitlabConfig", { keyPath: "id" })
          configStore.createIndex("updatedAt", "updatedAt", { unique: false })
        }

        // Projects store
        if (!db.objectStoreNames.contains("projects")) {
          const projectsStore = db.createObjectStore("projects", { keyPath: "id" })
          projectsStore.createIndex("selected", "selected", { unique: false })
          projectsStore.createIndex("addedAt", "addedAt", { unique: false })
        }

        // User settings store
        if (!db.objectStoreNames.contains("userSettings")) {
          const settingsStore = db.createObjectStore("userSettings", { keyPath: "id" })
          settingsStore.createIndex("updatedAt", "updatedAt", { unique: false })
        }
      }
    })
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = "readonly"): Promise<IDBObjectStore> {
    if (!this.db) {
      await this.init()
    }
    const transaction = this.db!.transaction([storeName], mode)
    return transaction.objectStore(storeName)
  }

  // GitLab Configuration methods
  async saveGitLabConfig(gitlabUrl: string, encryptedToken: string): Promise<void> {
    const store = await this.getStore("gitlabConfig", "readwrite")
    const config: GitLabConfig = {
      id: "main",
      gitlabUrl,
      encryptedToken,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return new Promise((resolve, reject) => {
      const request = store.put(config)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getGitLabConfig(): Promise<GitLabConfig | null> {
    const store = await this.getStore("gitlabConfig")

    return new Promise((resolve, reject) => {
      const request = store.get("main")
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteGitLabConfig(): Promise<void> {
    const store = await this.getStore("gitlabConfig", "readwrite")

    return new Promise((resolve, reject) => {
      const request = store.delete("main")
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Projects methods
  async saveProjects(projects: StoredProject[]): Promise<void> {
    const store = await this.getStore("projects", "readwrite")

    if (projects.length === 0) {
      return Promise.resolve()
    }

    const promises = projects.map((project) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(project)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    })

    return Promise.all(promises).then(() => undefined)
  }

  async getSelectedProjects(): Promise<StoredProject[]> {
    const store = await this.getStore("projects")

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const all = (request.result || []) as StoredProject[]
        const selected = all.filter((p) => p.selected === true)
        resolve(selected)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getAllProjects(): Promise<StoredProject[]> {
    const store = await this.getStore("projects")

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async updateProjectSelection(projectId: number, selected: boolean): Promise<void> {
    const store = await this.getStore("projects", "readwrite")

    return new Promise((resolve, reject) => {
      const getRequest = store.get(projectId)
      getRequest.onsuccess = () => {
        const project = getRequest.result
        if (project) {
          project.selected = selected
          const putRequest = store.put(project)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          reject(new Error("Project not found"))
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async clearProjects(): Promise<void> {
    const store = await this.getStore("projects", "readwrite")

    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // User Settings methods
  async saveUserSettings(settings: Partial<UserSettings>): Promise<void> {
    const store = await this.getStore("userSettings", "readwrite")

    // Get existing settings first
    const existing = await this.getUserSettings()
    const updatedSettings: UserSettings = {
      id: "main",
      language: settings.language || existing?.language || "en",
      theme: settings.theme || existing?.theme || "light",
      kanbanSettings: {
        ticketsPerColumn: settings.kanbanSettings?.ticketsPerColumn || existing?.kanbanSettings?.ticketsPerColumn || 10,
        autoRefresh: settings.kanbanSettings?.autoRefresh ?? existing?.kanbanSettings?.autoRefresh ?? false,
        refreshInterval: settings.kanbanSettings?.refreshInterval || existing?.kanbanSettings?.refreshInterval || 30000,
      },
      updatedAt: new Date(),
    }

    return new Promise((resolve, reject) => {
      const request = store.put(updatedSettings)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getUserSettings(): Promise<UserSettings | null> {
    const store = await this.getStore("userSettings")

    return new Promise((resolve, reject) => {
      const request = store.get("main")
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    await Promise.all([
      this.deleteGitLabConfig(),
      this.clearProjects(),
      this.getStore("userSettings", "readwrite").then((store) => {
        return new Promise<void>((resolve, reject) => {
          const request = store.clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      }),
    ])
  }

  async exportData(): Promise<string> {
    const [config, projects, settings] = await Promise.all([
      this.getGitLabConfig(),
      this.getAllProjects(),
      this.getUserSettings(),
    ])

    return JSON.stringify(
      {
        config: config ? { ...config, encryptedToken: "[ENCRYPTED]" } : null, // Don't export the actual token
        projects,
        settings,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    )
  }
}

export const db = new DatabaseManager()
