export type Language = "en" | "fr"

export interface Translations {
  // Common
  loading: string
  error: string
  save: string
  cancel: string
  delete: string
  edit: string
  create: string
  search: string
  filter: string
  clear: string
  loadMore: string
  remaining: string

  // Refresh
  dataRefreshed: string
  refreshError: string

  // Navigation
  dashboard: string
  projects: string
  configuration: string
  reconfiguration: string
  refresh: string

  // Project management
  projectManagement: string
  addProject: string
  manageProjects: string
  selectProjects: string
  selectedProjects: string
  noProjectSelected: string
  selectProjectFromSidebar: string

  // Kanban
  kanbanBoard: string
  newIssue: string
  newTicket: string
  searchByNumber: string
  searchByTitle: string
  filterByPriority: string
  filterByLabels: string
  filterByTags: string
  assignedTo: string
  allAssignees: string
  clearFilters: string
  issuesFound: string
  issueFound: string

  // Issue details
  issueTitle: string
  issueDescription: string
  createdBy: string
  assignedTo_: string
  labels: string
  comments: string
  noComments: string
  viewInGitlab: string
  unassigned: string

  // Issue creation/editing
  createIssue: string
  editIssue: string
  updateIssue: string
  issueTitle_: string
  issueDescription_: string
  selectLabels: string
  selectAssignee: string
  noLabels: string
  noAssignee: string
  creating: string
  updating: string
  startDate: string
  dueDate: string
  selectStartDate: string
  selectDueDate: string
  status: string
  selectStatus: string
  allLabelsSelected: string

  // Placeholders
  issueTitlePlaceholder: string
  issueDescriptionPlaceholder: string

  // States
  todo: string
  inProgress: string
  review: string
  done: string
  opened: string
  closed: string
  all: string

  // Priority
  low: string
  medium: string
  high: string
  urgent: string

  // Configuration
  gitlabConfiguration: string
  gitlabReconfiguration: string
  configureGitlabConnection: string
  modifyGitlabConfiguration: string
  gitlabInstanceUrl: string
  personalAccessToken: string
  tokenRequired: string
  howToCreateToken: string
  testConnection: string
  connectionSuccessful: string
  connectionTesting: string
  continue: string
  abort: string
  gitlabDocumentation: string

  // Views
  views: string
  kanban: string
  gantt: string
  ganttComingSoon: string
  ganttDescription: string

  // Language
  language: string
  english: string
  french: string

  // Configuration - nouvelles clés
  selfHostedGitlabInstance: string
  tokenInstructions1: string
  tokenInstructions2: string
  tokenInstructions3: string

  // Labels
  newLabelPlaceholder: string
  addLabel: string
  createNewLabel: string

  // Delete confirmation
  deleteIssue: string
  deleteIssueConfirmation: string
  deleteIssueWarning: string
  deleting: string

  // Due date labels
  overdueDays: string
  overdueDay: string
  dueToday: string
  dueTomorrow: string
  dueInDays: string
  day: string
  days: string

  // Success/Error messages
  success: string
  ticketMoved: string
  movedTo: string
  unknownError: string
  cannotMoveTicket: string
  issue: string
  issueCreated: string
  createdSuccessfully: string
  issueUpdated: string
  updatedSuccessfully: string
  operationError: string
  issueDeleted: string
  deletedSuccessfully: string
  deletionError: string
  errorUpdatingIssue: string

  // Gantt specific
  timeline: string
  tasks: string
  duration: string
  withDates: string
  noIssuesWithDates: string
  noIssuesWithDatesDescription: string
  to: string
}

export const translations: Record<Language, Translations> = {
  en: {
    // Common
    loading: "Loading...",
    error: "Error",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    search: "Search",
    filter: "Filter",
    clear: "Clear",
    loadMore: "Load More",
    remaining: "remaining",

    // Navigation
    dashboard: "Dashboard",
    projects: "Projects",
    configuration: "Configuration",
    reconfiguration: "Reconfiguration",
    refresh: "Refresh",

    // Project management
    projectManagement: "Project Management",
    addProject: "Add Project",
    manageProjects: "Manage Projects",
    selectProjects: "Select Projects",
    selectedProjects: "Selected Projects",
    noProjectSelected: "No Project Selected",
    selectProjectFromSidebar: "Select a project from the left sidebar",

    // Kanban
    kanbanBoard: "Kanban Board",
    newIssue: "New Issue",
    newTicket: "New Ticket",
    searchByNumber: "Search by #number or title...",
    searchByTitle: "Search by ticket number or title...",
    filterByPriority: "Priority",
    filterByLabels: "Labels",
    filterByTags: "Tags",
    assignedTo: "Assigned to",
    allAssignees: "All assignees",
    clearFilters: "Clear filters",
    issuesFound: "issues found",
    issueFound: "issue found",

    // Issue details
    issueTitle: "Issue Title",
    issueDescription: "Issue Description",
    createdBy: "Created by",
    assignedTo_: "Assigned to:",
    labels: "Labels",
    comments: "Comments",
    noComments: "No comments",
    viewInGitlab: "View in GitLab",
    unassigned: "Unassigned",

    // Issue creation/editing
    createIssue: "Create Issue",
    editIssue: "Edit Issue",
    updateIssue: "Update Issue",
    issueTitle_: "Title *",
    issueDescription_: "Description",
    selectLabels: "Select labels...",
    selectAssignee: "Select assignee...",
    noLabels: "No labels",
    noAssignee: "No assignee",
    creating: "Creating...",
    updating: "Updating...",
    startDate: "Start Date",
    dueDate: "Due Date",
    selectStartDate: "Select start date...",
    selectDueDate: "Select due date...",
    status: "Status",
    selectStatus: "Select status...",
    allLabelsSelected: "All labels are selected",

    // Placeholders
    issueTitlePlaceholder: "Issue title...",
    issueDescriptionPlaceholder: "Issue description (Markdown supported)...",

    // States
    todo: "To Do",
    inProgress: "In Progress",
    review: "Review",
    done: "Done",
    opened: "Open",
    closed: "Closed",
    all: "All",

    // Priority
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",

    // Configuration
    gitlabConfiguration: "GitLab Configuration",
    gitlabReconfiguration: "GitLab Reconfiguration",
    configureGitlabConnection: "Configure your GitLab connection to get started",
    modifyGitlabConfiguration: "Modify your GitLab configuration",
    gitlabInstanceUrl: "GitLab Instance URL",
    personalAccessToken: "Personal Access Token GitLab *",
    tokenRequired: "Token required to access your GitLab projects.",
    howToCreateToken: "How to create a token:",
    testConnection: "Test Connection",
    connectionSuccessful: "✓ Connection successful",
    connectionTesting: "Testing connection...",
    continue: "Continue",
    abort: "Abort",
    gitlabDocumentation: "Official GitLab Documentation - Personal Access Tokens",

    // Views
    views: "Views",
    kanban: "Kanban",
    gantt: "Gantt",
    ganttComingSoon: "Gantt (Coming Soon)",
    ganttDescription: "This feature will be available soon",

    // Language
    language: "Language",
    english: "English",
    french: "French",

    // Configuration - nouvelles clés
    selfHostedGitlabInstance: "For self-hosted GitLab instances (e.g. https://gitlab.intech.dev)",
    tokenInstructions1: "1. Go to GitLab → Preferences → Access Tokens",
    tokenInstructions2: "2. Create a new token with scopes:",
    tokenInstructions3: "3. Copy the full value (starts with",

    // Labels
    newLabelPlaceholder: "New label name...",
    addLabel: "Add label...",
    createNewLabel: "Create",

    // Delete confirmation
    deleteIssue: "Delete Issue",
    deleteIssueConfirmation: "Are you sure you want to delete this issue?",
    deleteIssueWarning: "This action cannot be undone. The issue will be permanently deleted from GitLab.",
    deleting: "Deleting...",

    // Due date labels
    overdueDays: "overdue by",
    overdueDay: "overdue by",
    dueToday: "Due today",
    dueTomorrow: "Due tomorrow",
    dueInDays: "in",
    day: "day",
    days: "days",

    // Success/Error messages
    success: "Success",
    ticketMoved: "Ticket moved",
    movedTo: "moved to",
    unknownError: "Unknown error",
    cannotMoveTicket: "Cannot move ticket",
    issue: "Issue",
    issueCreated: "Issue created",
    createdSuccessfully: "created successfully",
    issueUpdated: "Issue updated",
    updatedSuccessfully: "updated successfully",
    operationError: "Error during operation",
    issueDeleted: "Issue deleted",
    deletedSuccessfully: "deleted successfully",
    errorUpdatingIssue: "Error updating the ticket",

    // Gantt specific
    deletionError: "Error during deletion",
    timeline: "Timeline",
    tasks: "Tasks",
    duration: "Duration",
    withDates: "with start and due dates",
    noIssuesWithDates: "No Issues with Dates",
    noIssuesWithDatesDescription: "Only issues with both start date and due date are displayed in the Gantt view. Add dates to your issues to see them here.",
    to: "to",
    dataRefreshed: "Data refreshed successfully",
    refreshError: "Failed to refresh data"
  },
  fr: {
    // Common
    loading: "Chargement...",
    error: "Erreur",
    save: "Sauvegarder",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    create: "Créer",
    search: "Rechercher",
    filter: "Filtrer",
    clear: "Effacer",
    loadMore: "Charger plus",
    remaining: "restants",

    // Navigation
    dashboard: "Tableau de bord",
    projects: "Projets",
    configuration: "Configuration",
    reconfiguration: "Reconfiguration",
    refresh: "Recharger",

    // Project management
    projectManagement: "Gestion de projets",
    addProject: "Ajouter",
    manageProjects: "Gérer les projets",
    selectProjects: "Sélection des projets",
    selectedProjects: "Projets sélectionnés",
    noProjectSelected: "Aucun projet sélectionné",
    selectProjectFromSidebar: "Sélectionnez un projet dans le menu de gauche",

    // Kanban
    kanbanBoard: "Tableau Kanban",
    newIssue: "Nouvelle issue",
    newTicket: "Nouveau ticket",
    searchByNumber: "Rechercher par #numéro ou titre...",
    searchByTitle: "Rechercher par numéro de ticket ou titre...",
    filterByPriority: "Priorité",
    filterByLabels: "Labels",
    filterByTags: "Tags",
    assignedTo: "Assigné à",
    allAssignees: "Tous les assignés",
    clearFilters: "Effacer les filtres",
    issuesFound: "issues trouvées",
    issueFound: "issue trouvée",

    // Issue details
    issueTitle: "Titre de l'issue",
    issueDescription: "Description de l'issue",
    createdBy: "Créé par",
    assignedTo_: "Assigné à :",
    labels: "Labels",
    comments: "Commentaires",
    noComments: "Aucun commentaire",
    viewInGitlab: "Voir dans GitLab",
    unassigned: "Non assigné",

    // Issue creation/editing
    createIssue: "Créer l'issue",
    editIssue: "Modifier l'issue",
    updateIssue: "Mettre à jour",
    issueTitle_: "Titre *",
    issueDescription_: "Description",
    selectLabels: "Sélectionner des labels...",
    selectAssignee: "Sélectionner un assigné...",
    noLabels: "Aucun label",
    noAssignee: "Aucun assigné",
    creating: "Création...",
    updating: "Mise à jour...",
    startDate: "Date de début",
    dueDate: "Date d'échéance",
    selectStartDate: "Sélectionner la date de début...",
    selectDueDate: "Sélectionner la date d'échéance...",
    status: "Statut",
    selectStatus: "Sélectionner un statut...",
    allLabelsSelected: "Tous les labels sont sélectionnés",

    // Placeholders
    issueTitlePlaceholder: "Titre de l'issue...",
    issueDescriptionPlaceholder: "Description de l'issue (Markdown supporté)...",

    // States
    todo: "À faire",
    inProgress: "En cours",
    review: "En révision",
    done: "Terminé",
    opened: "Ouvertes",
    closed: "Fermées",
    all: "Toutes",

    // Priority
    low: "Faible",
    medium: "Moyen",
    high: "Élevé",
    urgent: "Urgent",

    // Configuration
    gitlabConfiguration: "Configuration GitLab",
    gitlabReconfiguration: "Reconfiguration GitLab",
    configureGitlabConnection: "Configurez votre connexion GitLab pour commencer",
    modifyGitlabConfiguration: "Modifiez votre configuration GitLab",
    gitlabInstanceUrl: "URL de votre instance GitLab",
    personalAccessToken: "Personal Access Token GitLab *",
    tokenRequired: "Token requis pour accéder à vos projets GitLab.",
    howToCreateToken: "Comment créer un token :",
    testConnection: "Tester la connexion",
    connectionSuccessful: "✓ Connexion réussie",
    connectionTesting: "Test en cours...",
    continue: "Continuer",
    abort: "Annuler",
    gitlabDocumentation: "Documentation officielle GitLab - Personal Access Tokens",

    // Views
    views: "Vues",
    kanban: "Kanban",
    gantt: "Gantt",
    ganttComingSoon: "Gantt (Bientôt)",
    ganttDescription: "Cette fonctionnalité sera disponible prochainement",

    // Language
    language: "Langue",
    english: "Anglais",
    french: "Français",

    // Configuration - nouvelles clés
    selfHostedGitlabInstance: "Pour les instances GitLab auto-hébergées (ex: https://gitlab.intech.dev)",
    tokenInstructions1: "1. Allez dans GitLab → Préférences → Tokens d'accès",
    tokenInstructions2: "2. Créez un nouveau token avec les scopes :",
    tokenInstructions3: "3. Copiez la valeur complète (commence par",

    // Labels
    newLabelPlaceholder: "Nom du nouveau label...",
    addLabel: "Ajouter un label...",
    createNewLabel: "Créer",

    // Delete confirmation
    deleteIssue: "Supprimer l'issue",
    deleteIssueConfirmation: "Êtes-vous sûr de vouloir supprimer cette issue ?",
    deleteIssueWarning: "Cette action ne peut pas être annulée. L'issue sera définitivement supprimée de GitLab.",
    deleting: "Suppression...",

    // Due date labels
    overdueDays: "en retard de",
    overdueDay: "en retard de",
    dueToday: "Échéance aujourd'hui",
    dueTomorrow: "Échéance demain",
    dueInDays: "dans",
    day: "jour",
    days: "jours",

    // Success/Error messages
    success: "Succès",
    ticketMoved: "Ticket déplacé",
    movedTo: "déplacé vers",
    unknownError: "Erreur inconnue",
    cannotMoveTicket: "Impossible de déplacer le ticket",
    issue: "Issue",
    issueCreated: "Issue créée",
    createdSuccessfully: "créée avec succès",
    issueUpdated: "Issue mise à jour",
    updatedSuccessfully: "mise à jour avec succès",
    operationError: "Erreur lors de l'opération",
    issueDeleted: "Issue supprimée",
    deletedSuccessfully: "supprimée avec succès",
    deletionError: "Erreur lors de la suppression",
    errorUpdatingIssue: "Erreur lors de la mise à jour du ticket",

    // Gantt specific
    timeline: "Chronologie",
    tasks: "Tâches",
    duration: "Durée",
    withDates: "avec dates de début et de fin",
    noIssuesWithDates: "Aucune Issue avec Dates",
    noIssuesWithDatesDescription: "Seules les issues avec une date de début et une date de fin sont affichées dans la vue Gantt. Ajoutez des dates à vos issues pour les voir ici.",
    to: "à",
    dataRefreshed: "Données rechargées avec succès",
    refreshError: "Error lors du rechargement des données"
  },
}
