# GitLab Kanban Manager

A modern, responsive Kanban board for GitLab projects built with Next.js, TypeScript, and Tailwind CSS. Manage your GitLab issues with an intuitive drag-and-drop interface, advanced filtering, and real-time synchronization.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

## ✨ Features

### 🎯 Core Functionality
- **Drag & Drop Interface**: Move issues between columns with smooth animations
- **Multi-Project Support**: Manage multiple GitLab projects from a single dashboard
- **Real-time Sync**: Changes are immediately reflected in GitLab
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

### 🔍 Advanced Filtering & Search
- **Smart Search**: Search by issue number, title, or description
- **Label Filtering**: Filter issues by multiple labels
- **Assignee Filtering**: View issues by specific team members
- **State Filtering**: Show open, closed, or all issues

### 📋 Issue Management
- **Create Issues**: Add new issues directly from the Kanban board
- **Rich Descriptions**: Full Markdown support with image rendering
- **Label Management**: Create and assign labels with multi-select interface
- **Assignee Management**: Assign issues to team members

### 💬 Comments & Collaboration
- **Collapsible Comments**: Load comments on-demand to improve performance
- **Markdown Support**: Rich text formatting in comments and descriptions
- **Image Support**: Automatic URL correction for GitLab-hosted images
- **User Avatars**: Visual identification of team members

### 🎨 Customizable Workflow
- **Configurable Columns**: Customize your workflow with predefined column configurations
- **Label-based Routing**: Automatically route issues based on labels
- **Visual Indicators**: Color-coded priorities and status indicators
- **Progress Tracking**: Visual progress indicators for each column

### 🔒 Security & Privacy
- **Encrypted Storage**: Personal Access Tokens are encrypted using device-specific keys
- **Local Storage**: All data stored locally in IndexedDB
- **No Server Required**: Completely client-side application
- **CORS Compliant**: Works with GitLab.com and self-hosted instances

### 🌍 Internationalization
- **Multi-language Support**: English and French translations
- **Easy Extension**: Simple translation system for adding new languages
- **Locale-aware**: Date formatting and number display respect user locale

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- GitLab Personal Access Token

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/gitlab-kanban-manager.git
cd gitlab-kanban-manager
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Start the development server**
```bash
pnpm run dev
```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### GitLab Configuration

1. **Create a Personal Access Token**
    - Go to GitLab → User Settings → Access Tokens
    - Create a new token with scopes: `api`, `read_user`
    - Copy the token (starts with `glpat-`)

2. **Configure the Application**
    - Enter your GitLab instance URL (e.g., `https://gitlab.com` or `https://your-gitlab.example.com`)
    - Paste your Personal Access Token
    - Test the connection

3. **Select Projects**
    - Choose which GitLab projects you want to manage
    - Projects will appear in your dashboard sidebar

## 📖 Usage Guide

### Setting Up Your Kanban Board

The application comes with a pre-configured workflow that maps GitLab labels to Kanban columns:

| Column | Labels                                       | Description |
|--------|----------------------------------------------|-------------|
| 📋 Backlog | Default                                      | Issues without specific workflow labels |
| ⏳ 0 - À valider | `⏳ 0 - À valider`, `à valider`, `to validate`, `validation` | Issues awaiting validation |
| 🎯 1 - À estimer | `🎯 1 - À estimer`, `à estimer`, `to estimate`, `estimation` | Issues needing estimation |
| 📌 2 - À développer | `📌 2 - À développer`, `à développer`, `to develop`, `todo`         | Ready for development |
| 🏄 3 - En cours | `🏄 3 - En cours`, `en cours`, `in progress`, `doing`, `wip`    | Currently in development |
| 🔍 4 - À review | `🔍 4 - À review`, `à review`, `to review`, `review`            | Code review phase |
| ✅ 5 - À tester | `✅ 5 - À tester`, `à tester`, `to test`, `testing`, `qa`       | Testing phase |
| 🛫 6 - À déployer | `🛫 6 - À déployer`, `à déployer`, `to deploy`, `deployment`      | Ready for deployment |
| 🎉 Terminé | Closed issues                                | Completed work |

## ⚙️ Configuration

### Kanban Column Configuration

You can customize the Kanban columns by editing `config/kanban-config.ts`:

```typescript
export const kanbanConfig: KanbanConfig = {
    fallbackColumn: "open",
    closedColumn: "closed",
    columns: [
        {
        id: "custom-column",
        name: "Custom Column",
        emoji: "🔥",
        order: 1,
        color: "#ff6b6b",
        labels: ["custom-label", "priority"],
        matchCriteria: "labels",
        },
        // ... more columns
    ],
}
```

### Environment Variables

Create a `.env.local` file for development:

```env
# Optional: Default GitLab token for development
NEXT_PUBLIC_GITLAB_TOKEN=your_token_here
```

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Drag & Drop**: @dnd-kit
- **Storage**: IndexedDB with encryption
- **Markdown**: react-markdown

### Project Structure
```
├── app/                    # Next.js app directory
│   ├── dashboard/         # Main dashboard page
│   ├── projects/          # Project selection page
│   └── page.tsx          # Configuration page
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   └── ...               # Feature-specific components
├── config/               # Configuration files
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
└── types/                # TypeScript type definitions
```

### Data Flow
1. **Authentication**: Personal Access Token encrypted and stored locally
2. **Project Selection**: User selects GitLab projects to manage
3. **Data Fetching**: Issues fetched from GitLab API
4. **Local Processing**: Issues categorized into Kanban columns
5. **Real-time Updates**: Changes synchronized back to GitLab

## 🔧 Development

### Available Scripts

```bash
# Development server
pnpm run dev

# Production build
pnpm run build

# Start production server
pnpm start

# Linting
pnpm run lint

# Type checking
pnpm run type-check
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Code Style

- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Code formatting is handled automatically
- **TypeScript**: Maintain strict type safety
- **Conventional Commits**: Use conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **GitLab**: For providing an excellent API
- **Radix UI**: For accessible UI primitives
- **Tailwind CSS**: For utility-first CSS framework
- **@dnd-kit**: For the drag and drop functionality

## 🗺️ Roadmap

### Upcoming Features
- [ ] **Gantt Chart View**: Timeline visualization of issues
- [ ] **Burndown Charts**: Sprint progress tracking
- [ ] **Custom Fields**: Support for GitLab custom fields
- [ ] **Webhooks**: Real-time updates via GitLab webhooks
- [ ] **Bulk Operations**: Multi-select and bulk edit issues
- [ ] **Time Tracking**: Integration with GitLab time tracking
- [ ] **Milestone Management**: Visual milestone progress
- [ ] **Export/Import**: Backup and restore configurations
