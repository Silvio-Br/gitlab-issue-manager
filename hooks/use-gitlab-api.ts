"use client"

import { useMemo } from "react"
import { GitLabAPI } from "@/lib/gitlab-api"

interface UseGitLabApiProps {
  gitlabToken?: string
  gitlabUrl?: string
  projectId?: string
}

export function useGitLabApi(props?: UseGitLabApiProps) {
  const gitlabApi = useMemo(() => {
    if (props?.gitlabToken && props?.gitlabUrl) {
      return new GitLabAPI(props.gitlabToken, props.gitlabUrl)
    }
    return null
  }, [props?.gitlabToken, props?.gitlabUrl])

  return {
    gitlabApi,
    projectId: props?.projectId,
  }
}
