"use client"

import { useMemo, useCallback } from "react"
import { GitLabAPI } from "@/lib/gitlab-api"

interface UseGitLabAPIProps {
  gitlabToken?: string
  gitlabUrl?: string
  projectId?: string
}

export function useGitLabAPI(props?: UseGitLabAPIProps) {
  const gitlabApi = useMemo(() => {
    if (props?.gitlabToken && props?.gitlabUrl) {
      return new GitLabAPI(props.gitlabToken, props.gitlabUrl)
    }
    return null
  }, [props?.gitlabToken, props?.gitlabUrl])

  // Custom link component for ReactMarkdown
  const CustomLink = useCallback(
    ({ href, children, ...linkProps }: any) => {
      let finalHref = href

      // Transform relative /uploads/ URLs
      if (href && href.startsWith("/uploads/") && props?.gitlabUrl && props?.projectId) {
        finalHref = `${props.gitlabUrl}/-/project/${props.projectId}${href}`
      }

      return (
        <a
          href={finalHref}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 underline"
      {...linkProps}
    >
      {children}
      </a>
    )
    },
    [props?.gitlabUrl, props?.projectId],
  )

  // Custom image component for ReactMarkdown
  const CustomImage = useCallback(
    ({ src, alt, ...imgProps }: any) => {
      let finalSrc = src

      // Transform relative /uploads/ URLs
      if (src && src.startsWith("/uploads/") && props?.gitlabUrl && props?.projectId) {
        finalSrc = `${props.gitlabUrl}/-/project/${props.projectId}${src}`
      }

      return (
        <img
          src={finalSrc || "/placeholder.svg"}
      alt={alt}
      className="max-w-full h-auto rounded-lg border"
      {...imgProps}
      />
    )
    },
    [props?.gitlabUrl, props?.projectId],
  )

  return {
    gitlabApi,
    projectId: props?.projectId || "",
    CustomLink,
    CustomImage,
  }
}
