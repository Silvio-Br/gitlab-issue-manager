"use client"

import { Loader2, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog"
import {
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

import type { GitLabIssue } from "@/types/gitlab"
import { useLanguage } from "@/contexts/language-context"

interface DeleteIssueDialogProps {
  issue: GitLabIssue | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: (issue: GitLabIssue) => void
}

export function DeleteIssueDialog({ issue, isDeleting, onClose, onConfirm }: DeleteIssueDialogProps) {
  const { t } = useLanguage()

  return (
    <AlertDialog open={!!issue} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            {t.deleteIssue}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{t.deleteIssueConfirmation}</p>
            {issue && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    #{issue.iid}
                  </Badge>
                </div>
                <p className="font-medium text-sm">{issue.title}</p>
              </div>
            )}
            <p className="text-red-600 text-sm">{t.deleteIssueWarning}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => issue && onConfirm(issue)}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.deleting}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {t.delete}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
