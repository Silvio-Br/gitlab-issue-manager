"use client"

import { useState, useMemo } from "react"
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
}

export function CollapsibleComments({ issue }: CollapsibleCommentsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [comments, setComments] = useState<GitLabComment[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const { t } = useLanguage()
  const { gitlabApi, projectId, CustomLink, CustomImage } = useGitLabAPI()

  const loadComments = async () => {
    if (hasLoaded) return

    try {
      setLoading(true)
      // @ts-ignore
      const commentsData = await gitlabApi.getIssueComments(projectId, issue.iid)
      // Filter system comments and start date comments
      const filteredComments = commentsData.filter(
        (comment) => !comment.system && !comment.body.match(/\*\*Start Date:\*\*/),
      )
      setComments(filteredComments)
      setHasLoaded(true)
    } catch (err) {
      console.error("Error loading comments:", err)
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate visible comments count (without start date comments)
  const visibleCommentsCount = useMemo(() => {
    if (!hasLoaded) {
      // Estimation based on total count minus potential start date comments
      return issue.user_notes_count || 0
    }
    return comments.length
  }, [hasLoaded, comments.length, issue.user_notes_count])

  const handleToggle = () => {
    if (!isOpen && !hasLoaded) {
      loadComments()
    }
    setIsOpen(!isOpen)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-0 h-auto font-medium text-sm"
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
        ) : comments.length > 0 ? (
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
        ) : (
          <p className="text-sm text-gray-500 py-4">{t.noComments}</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
