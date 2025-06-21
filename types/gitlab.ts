export interface GitLabIssue {
  id: number
  iid: number
  title: string
  description: string
  state: "opened" | "closed"
  created_at: string
  updated_at: string
  due_date: string | null
  labels: string[]
  assignees: GitLabUser[]
  author: GitLabUser
  web_url: string
  milestone: GitLabMilestone | null
  weight: number | null
}

export interface GitLabUser {
  id: number
  name: string
  username: string
  avatar_url: string
}

export interface GitLabMilestone {
  id: number
  title: string
  description: string
  due_date: string | null
}

export interface GitLabLabel {
  id: number
  name: string
  color: string
  description: string
}

export interface GitLabProject {
  id: number
  name: string
  description: string
  web_url: string
}
