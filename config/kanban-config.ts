export interface KanbanColumnConfig {
  id: string
  name: string
  emoji?: string
  order: number
  color: string
  labels: string[]
  isDefault?: boolean // Pour les colonnes par défaut (Open/Closed)
  matchCriteria?: "labels" | "state" | "fallback"
}

export interface KanbanConfig {
  columns: KanbanColumnConfig[]
  fallbackColumn: string // ID de la colonne par défaut pour les issues sans label
  closedColumn: string // ID de la colonne pour les issues fermées
}

// Configuration du tableau Kanban
export const kanbanConfig: KanbanConfig = {
  fallbackColumn: "open",
  closedColumn: "closed",
  columns: [
    {
      id: "open",
      name: "Backlog",
      emoji: "📋",
      order: 0,
      color: "#6b7280",
      labels: [],
      isDefault: true,
      matchCriteria: "fallback",
    },
    {
      id: "to-validate",
      name: "0 - À valider",
      emoji: "⏳",
      order: 1,
      color: "#f59e0b",
      labels: ["⏳ 0 - À valider", "à valider", "to validate", "validation", "0-validation", "0 - à valider"],
      matchCriteria: "labels",
    },
    {
      id: "to-estimate",
      name: "1 - À estimer",
      emoji: "🎯",
      order: 2,
      color: "#8b5cf6",
      labels: ["🎯 1 - À estimer", "à estimer", "to estimate", "estimation", "1-estimation", "1 - à estimer"],
      matchCriteria: "labels",
    },
    {
      id: "to-develop",
      name: "2 - À développer",
      emoji: "📌",
      order: 3,
      color: "#3b82f6",
      labels: ["📌 2 - À développer", "à développer", "to develop", "todo", "à faire", "2-todo", "2 - à développer"],
      matchCriteria: "labels",
    },
    {
      id: "in-progress",
      name: "3 - En cours",
      emoji: "🏄",
      order: 4,
      color: "#06b6d4",
      labels: ["🏄 3 - En cours", "en cours", "in progress", "doing", "wip", "3-doing", "3 - en cours"],
      matchCriteria: "labels",
    },
    {
      id: "to-review",
      name: "4 - À review",
      emoji: "🔍",
      order: 5,
      color: "#ec4899",
      labels: ["🔍 4 - À review", "à review", "to review", "review", "code review", "4-review", "4 - à review"],
      matchCriteria: "labels",
    },
    {
      id: "to-test",
      name: "5 - À tester",
      emoji: "✅",
      order: 6,
      color: "#84cc16",
      labels: ["✅ 5 - À tester", "à tester", "to test", "testing", "qa", "5-testing", "5 - à tester"],
      matchCriteria: "labels",
    },
    {
      id: "to-deploy",
      name: "6 - À déployer",
      emoji: "🛫",
      order: 7,
      color: "#f97316",
      labels: ["🛫 6 - À déployer", "à déployer", "to deploy", "deployment", "ready", "6-deploy", "6 - à déployer"],
      matchCriteria: "labels",
    },
    {
      id: "closed",
      name: "Terminé",
      emoji: "🎉",
      order: 8,
      color: "#10b981",
      labels: [],
      isDefault: true,
      matchCriteria: "state",
    },
  ],
}

// Fonction helper pour obtenir la colonne d'une issue
export function getIssueColumn(issue: { labels: string[]; state: string }, config: KanbanConfig): string {
  // Si l'issue est fermée, elle va dans la colonne "closed"
  if (issue.state === "closed") {
    return config.closedColumn
  }

  // Chercher une correspondance avec les labels
  for (const column of config.columns) {
    if (column.matchCriteria === "labels" && column.labels.length > 0) {
      const hasMatchingLabel = issue.labels.some((issueLabel) =>
        column.labels.some(
          (configLabel) =>
            issueLabel.toLowerCase().includes(configLabel.toLowerCase()) ||
            configLabel.toLowerCase().includes(issueLabel.toLowerCase()),
        ),
      )
      if (hasMatchingLabel) {
        return column.id
      }
    }
  }

  // Si aucun label ne correspond, utiliser la colonne par défaut
  return config.fallbackColumn
}

// Fonction pour obtenir les colonnes triées
export function getSortedColumns(config: KanbanConfig): KanbanColumnConfig[] {
  return [...config.columns].sort((a, b) => a.order - b.order)
}
