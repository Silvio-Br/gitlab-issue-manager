# GitLab Kanban Manager

A modern, responsive Kanban board application for managing GitLab issues with advanced features like drag-and-drop, filtering, and real-time updates.

## Features

- 🎯 **Kanban Board**: Visual project management with drag-and-drop functionality
- 🏷️ **Smart Filtering**: Filter by labels, assignees, milestones, and due dates
- 🌐 **Internationalization**: Multi-language support (English, French, Spanish, German)
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- 🔒 **Secure**: Client-side encryption for sensitive data
- ⚡ **Performance**: Optimized loading with pagination and lazy loading
- 🎨 **Modern UI**: Clean interface with dark/light theme support

## Quick Start

### Option 1: Docker (Recommended)

#### Pull and Run from Docker Hub
```bash
# Pull the latest image
docker pull your-registry/gitlab-kanban-manager:latest

# Run the container
docker run -p 3000:3000 \
-e NEXT_PUBLIC_GITLAB_URL=https://gitlab.com \
-e NEXT_PUBLIC_GITLAB_TOKEN=your_gitlab_token \
your-registry/gitlab-kanban-manager:latest
```

#### Build and Run Locally
```bash
# Clone the repository
git clone https://github.com/your-username/gitlab-kanban-manager.git
cd gitlab-kanban-manager

# Build the Docker image
docker build -t gitlab-kanban-manager .

# Run the container
docker run -p 3000:3000 \
-e NEXT_PUBLIC_GITLAB_URL=https://gitlab.com \
-e NEXT_PUBLIC_GITLAB_TOKEN=your_gitlab_token \
gitlab-kanban-manager
```

#### Docker Compose
```yaml
version: '3.8'
services:
gitlab-kanban:
image: your-registry/gitlab-kanban-manager:latest
ports:
- "3000:3000"
environment:
- NEXT_PUBLIC_GITLAB_URL=https://gitlab.com
- NEXT_PUBLIC_GITLAB_TOKEN=your_gitlab_token
restart: unless-stopped
```

### Option 2: Local Development

#### Prerequisites
- Node.js 18+
- npm or yarn

#### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/gitlab-kanban-manager.git
cd gitlab-kanban-manager

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your GitLab configuration
# NEXT_PUBLIC_GITLAB_URL=https://gitlab.com
# NEXT_PUBLIC_GITLAB_TOKEN=your_gitlab_token

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_GITLAB_URL` | GitLab instance URL | Yes | - |
| `NEXT_PUBLIC_GITLAB_TOKEN` | GitLab personal access token | Yes | - |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | Default language (en, fr, es, de) | No | en |

### GitLab Token Setup

1. Go to your GitLab instance → **User Settings** → **Access Tokens**
2. Create a new token with the following scopes:
   - `api` - Full API access
   - `read_user` - Read user information
   - `read_repository` - Read repository data
3. Copy the token and add it to your environment variables

### Docker Environment Variables

When running with Docker, you can pass environment variables in several ways:

#### Command Line
```bash
docker run -p 3000:3000 \
-e NEXT_PUBLIC_GITLAB_URL=https://gitlab.com \
-e NEXT_PUBLIC_GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx \
-e NEXT_PUBLIC_DEFAULT_LANGUAGE=en \
gitlab-kanban-manager
```

#### Environment File
```bash
# Create .env file
echo "NEXT_PUBLIC_GITLAB_URL=https://gitlab.com" > .env
echo "NEXT_PUBLIC_GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx" >> .env

# Run with env file
docker run -p 3000:3000 --env-file .env gitlab-kanban-manager
```

#### Docker Compose with Environment File
```yaml
version: '3.8'
services:
gitlab-kanban:
image: gitlab-kanban-manager
ports:
- "3000:3000"
env_file:
- .env
restart: unless-stopped
```

## Usage

### Basic Workflow

1. **Connect to GitLab**: Enter your GitLab URL and access token
2. **Select Project**: Choose from your available GitLab projects
3. **Configure Board**: Set up columns based on issue labels or status
4. **Manage Issues**:
   - Drag and drop issues between columns
   - Create new issues directly from the board
   - Edit issue details in the modal
   - Filter issues by various criteria

### Keyboard Shortcuts

- `Ctrl/Cmd + N` - Create new issue
- `Ctrl/Cmd + F` - Focus search/filter
- `Escape` - Close modals/dialogs
- `Enter` - Confirm actions

### Filtering Options

- **Labels**: Filter by issue labels (excluding status labels)
- **Assignees**: Show issues assigned to specific users
- **Milestones**: Filter by project milestones
- **Due Dates**: Filter by due date ranges
- **Search**: Text search in issue titles and descriptions

## Development

### Project Structure

```
├── app/                    # Next.js app directory
├── components/            # React components
│   ├── kanban/           # Kanban-specific components
│   └── ui/               # Reusable UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── types/                # TypeScript type definitions
├── config/               # Configuration files
└── styles/               # Global styles
```

### Key Components

- **`GitLabKanbanBoard`**: Main board component
- **`IssueCard`**: Individual issue card with drag-and-drop
- **`KanbanColumn`**: Column container with drop zone
- **`IssueModal`**: Create/edit issue modal
- **`IssueDetailModal`**: Detailed issue view

### API Integration

The application uses the GitLab REST API v4. Key endpoints:

- `/projects` - List user projects
- `/projects/:id/issues` - Get project issues
- `/projects/:id/labels` - Get project labels
- `/projects/:id/members` - Get project members

### Building

#### Local Build
```bash
npm run build
npm start
```

#### Docker Build
```bash
# Development build
docker build -t gitlab-kanban-manager .

# Production build with staging
docker build -f Dockerfile.staging -t gitlab-kanban-manager:staging .
```

### Docker Deployment

#### Single Container
```bash
# Build
docker build -t gitlab-kanban-manager .

# Or pull
docker pull ghcr.io/silvio-br/gitlab-issue-manager:latest

# Run in production
docker run -d \
--name gitlab-kanban \
-p 80:3000 \
-e NEXT_PUBLIC_GITLAB_URL=https://your-gitlab.com \
-e NEXT_PUBLIC_GITLAB_TOKEN=your_token \
gitlab-kanban-manager

# Run locally
docker run -d \
--name gitlab-kanban \
-p 80:3000 \
gitlab-kanban-manager
```

#### With Docker Compose (Production)
```yaml
services:
   gitlab-kanban:
   build: .
   ports:
    - "80:3000"
   environment:
    - NEXT_PUBLIC_GITLAB_URL=https://your-gitlab.com
    - NEXT_PUBLIC_GITLAB_TOKEN=${GITLAB_TOKEN}
   restart: unless-stopped
```
