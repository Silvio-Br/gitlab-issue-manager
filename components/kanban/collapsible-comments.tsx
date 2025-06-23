"use client"

import { useState, useEffect } from "react"
import { MessageSquare, ChevronRight, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import type { GitLabIssue } from "@/types/gitlab"
import { useLanguage } from "@/contexts/language-context"
import { useGitLabAPI } from "@/hooks/use-gitlab-api"

interface GitLabComment {
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

interface CollapsibleCommentsProps {
  issue: GitLabIssue
  isVisible?: boolean // New prop to control when the component should be active
}

export function CollapsibleComments({ issue, isVisible = true }: CollapsibleCommentsProps) {
  const { gitlabApi, projectId, CustomLink, CustomImage } = useGitLabAPI()
  const { t } = useLanguage()

  const [isOpen, setIsOpen] = useState(false)
  const [comments, setComments] = useState<GitLabComment[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Use the issue's user_notes_count as initial count
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(issue.user_notes_count || 0)

  // Reset state when issue changes or component becomes invisible
  useEffect(() => {
    if (!isVisible) {
      setIsOpen(false)
      setComments([])
      setLoading(false)
      setHasLoaded(false)
      setVisibleCommentsCount(issue.user_notes_count || 0)
    }
  }, [issue.id, isVisible])

  const loadComments = async () => {
    // Don't load if component is not visible (modal not open)
    if (!isVisible) return

    // Only load if not already loaded and API is ready
    if (hasLoaded || loading) return

    // Check if API is ready before making the call
    if (!gitlabApi || !projectId) {
      console.warn("GitLab API or projectId not ready yet")
      return
    }

    try {
      setLoading(true)
      console.log(`Loading comments for issue #${issue.iid}`) // Debug log

      // @ts-ignore
      const commentsData = await gitlabApi.getIssueComments(projectId, issue.iid)

      // Filter system comments and start date comments
      const filteredComments = commentsData.filter(
        (comment) => !comment.system && !comment.body.match(/\*\*Start Date:\*\*/),
      )

      setComments(filteredComments)
      setVisibleCommentsCount(filteredComments.length)
      setHasLoaded(true)
    } catch (err) {
      console.error("Error loading comments:", err)
      setComments([])
      setVisibleCommentsCount(0)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    // Don't allow toggle if component is not visible
    if (!isVisible) return

    // Only load comments when user explicitly opens the section AND component is visible
    if (!isOpen && !hasLoaded && !loading && isVisible) {
      loadComments()
    }
    setIsOpen(!isOpen)
  }

  // Don't render anything if not visible (optional - for performance)
  if (!isVisible) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-0 h-auto font-medium text-sm hover:bg-gray-50"
          onClick={handleToggle}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {t.comments} ({visibleCommentsCount})
          </div>
          <div className="flex items-center gap-1">
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 mt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : hasLoaded && comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={comment.author.avatar_url || "/placeholder.svg"} alt={comment.author.name} />
                    <AvatarFallback className="text-xs">
                      {comment.author.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{comment.author.name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none pr-4">
                  <ReactMarkdown
                    components={{
                      a: CustomLink,
                      img: CustomImage,
                    }}
                  >
                    {comment.body}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        ) : hasLoaded && comments.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">{t.noComments}</p>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  )
}
