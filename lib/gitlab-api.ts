const GITLAB_API_BASE = "https://gitlab.com/api/v4"

export interface GitLabProject {
  id: number
  description: string
  name: string
  name_with_namespace: string
  path: string
  path_with_namespace: string
  created_at: string
  default_branch: string
  tag_list: string[]
  ssh_url_to_repo: string
  http_url_to_repo: string
  web_url: string
  readme_url: string
  avatar_url: string
  forks_count: number
  star_count: number
  last_activity_at: string
  namespace: {
    id: number
    name: string
    path: string
    kind: string
    full_path: string
    parent_id: number | null
    avatar_url: string
    web_url: string
  }
}

export interface GitLabIssue {
  id: number
  iid: number
  project_id: number
  title: string
  description: string
  state: string
  created_at: string
  updated_at: string
  closed_at: string | null
  closed_by: any | null
  labels: string[]
  milestone: any | null
  assignees: any[]
  author: {
    id: number
    name: string
    username: string
    state: string
    avatar_url: string
    web_url: string
  }
  assignee: any | null
  user_notes_count: number
  upvotes: number
  downvotes: number
  due_date: any | null
  start_date?: string | null // Ajouté pour la start date extraite des commentaires
  confidential: boolean
  discussion_locked: any | null
  web_url: string
  time_stats: {
    time_estimate: number
    total_time_spent: number
    human_time_estimate: any | null
    human_total_time_spent: any | null
  }
  _links: {
    self: string
    notes: string
    award_emoji: string
    project: string
  }
  references: {
    short: string
    relative: string
    full: string
  }
  moved_to_id: any | null
  service_desk_reply_to: any | null
  epic_iid: any | null
  epic: any | null
}

export interface GitLabLabel {
  id: number
  name: string
  color: string
  description: string
  description_html: string
  text_color: string
}

export interface GitLabComment {
  id: number
  body: string
  author: {
    id: number
    name: string
    username: string
    avatar_url: string
  }
  created_at: string
  updated_at: string
  system: boolean
}

export class GitLabAPI {
  public readonly token: string
  public readonly baseUrl: string

  constructor(token?: string, baseUrl?: string) {
    this.token = token || process.env.NEXT_PUBLIC_GITLAB_TOKEN || ""

    // Si une baseUrl personnalisée est fournie, ajouter /api/v4
    if (baseUrl && baseUrl !== "https://gitlab.com") {
      // Supprimer le trailing slash s'il existe
      const cleanBaseUrl = baseUrl.replace(/\/$/, "")
      this.baseUrl = `${cleanBaseUrl}/api/v4`
    } else {
      // URL par défaut pour gitlab.com
      this.baseUrl = GITLAB_API_BASE
    }
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.token) {
      headers["PRIVATE-TOKEN"] = this.token
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      throw new Error(`GitLab API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getProject(projectId: string): Promise<GitLabProject> {
    return this.request<GitLabProject>(`/projects/${encodeURIComponent(projectId)}`)
  }

  async getIssues(
    projectId: string,
    params?: {
      state?: "opened" | "closed" | "all"
      labels?: string
      search?: string
      per_page?: number
      page?: number
    },
  ): Promise<GitLabIssue[]> {
    const searchParams = new URLSearchParams()

    if (params?.state) searchParams.append("state", params.state)
    if (params?.labels) searchParams.append("labels", params.labels)
    if (params?.search) searchParams.append("search", params.search)
    if (params?.per_page) searchParams.append("per_page", params.per_page.toString())
    if (params?.page) searchParams.append("page", params.page.toString())

    const query = searchParams.toString()
    const endpoint = `/projects/${encodeURIComponent(projectId)}/issues${query ? `?${query}` : ""}`

    const issues = await this.request<GitLabIssue[]>(endpoint)

    // Pour chaque issue, extraire la start date des commentaires si elle existe
    const issuesWithStartDate = await Promise.all(
      issues.map(async (issue) => {
        try {
          const startDate = await this.extractStartDateFromComments(projectId, issue.iid)
          return { ...issue, start_date: startDate }
        } catch (err) {
          // En cas d'erreur, on continue sans start date
          return issue
        }
      }),
    )

    return issuesWithStartDate
  }

  async getIssueComments(projectId: string, issueIid: number): Promise<GitLabComment[]> {
    return this.request<GitLabComment[]>(`/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes`)
  }

  // Nouvelle méthode pour extraire la start date des commentaires
  private async extractStartDateFromComments(projectId: string, issueIid: number): Promise<string | null> {
    try {
      const comments = await this.getIssueComments(projectId, issueIid)

      // Chercher un commentaire contenant la start date
      for (const comment of comments) {
        const startDateMatch = comment.body.match(/\*\*Start Date:\*\*\s*(\d{4}-\d{2}-\d{2})/i)
        if (startDateMatch) {
          return startDateMatch[1]
        }
      }

      return null
    } catch (err) {
      console.error("Erreur lors de l'extraction de la start date:", err)
      return null
    }
  }

  async updateIssue(
    projectId: string,
    issueIid: number,
    data: {
      labels?: string[]
      assignee_ids?: number[]
      milestone_id?: number | null
      due_date?: string | null
    },
  ): Promise<GitLabIssue> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.token) {
      headers["PRIVATE-TOKEN"] = this.token
    }

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`GitLab API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async createIssue(
    projectId: string,
    data: {
      title: string
      description?: string
      labels?: string[]
      assignee_ids?: number[]
      milestone_id?: number | null
      due_date?: string | null
      start_date?: string | null // Ajouté pour la start date
    },
  ): Promise<GitLabIssue> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.token) {
      headers["PRIVATE-TOKEN"] = this.token
    }

    // Créer l'issue sans la start_date (non supportée par GitLab)
    const { start_date, ...issueData } = data

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(issueData),
    })

    if (!response.ok) {
      throw new Error(`GitLab API Error: ${response.status} ${response.statusText}`)
    }

    const newIssue = await response.json()

    // Si une start_date est fournie, l'ajouter en commentaire
    if (start_date) {
      try {
        await this.addStartDateComment(projectId, newIssue.iid, start_date)
        // Ajouter la start_date à l'objet retourné
        newIssue.start_date = start_date
      } catch (err) {
        console.error("Erreur lors de l'ajout du commentaire start date:", err)
        // On continue même si l'ajout du commentaire échoue
      }
    }

    return newIssue
  }

  // Nouvelle méthode pour ajouter un commentaire avec la start date
  private async addStartDateComment(projectId: string, issueIid: number, startDate: string): Promise<void> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.token) {
      headers["PRIVATE-TOKEN"] = this.token
    }

    const commentBody = `**Start Date:** ${startDate}`

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ body: commentBody }),
    })

    if (!response.ok) {
      throw new Error(`GitLab API Error: ${response.status} ${response.statusText}`)
    }
  }

  async deleteIssue(projectId: string, issueIid: number): Promise<void> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.token) {
      headers["PRIVATE-TOKEN"] = this.token
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    })

    if (!response.ok) {
      throw new Error(`GitLab API Error: ${response.status} ${response.statusText}`)
    }
  }

  async getProjectLabels(projectId: string): Promise<GitLabLabel[]> {
    return this.request<GitLabLabel[]>(`/projects/${encodeURIComponent(projectId)}/labels`)
  }

  async getProjectMembers(projectId: string): Promise<any[]> {
    return this.request<any[]>(`/projects/${encodeURIComponent(projectId)}/members`)
  }
}
