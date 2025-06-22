"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Edit, PlayCircle, Flag, X, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { fr, enUS } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import type { GitLabIssue } from "@/types/gitlab"
import type { KanbanColumnConfig } from "@/config/kanban-config"
import { useLanguage } from "@/contexts/language-context"

interface IssueForm {
  title: string
  description: string
  status: string
  labels: string[]
  assignee_id: number | null
  start_date: Date | null
  due_date: Date | null
}

interface IssueModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  form: IssueForm
  setForm: React.Dispatch<React.SetStateAction<IssueForm>>
  allAssigneesWithIds: any[]
  allNonStatusLabels: string[]
  availableColumns: KanbanColumnConfig[]
  isSubmitting: boolean
  mode: "create" | "edit"
  issue?: GitLabIssue
}

export function IssueModal({
                             isOpen,
                             onClose,
                             onSubmit,
                             form,
                             setForm,
                             allAssigneesWithIds,
                             allNonStatusLabels,
                             availableColumns,
                             isSubmitting,
                             mode,
                             issue,
                           }: IssueModalProps) {
  const [customLabelInput, setCustomLabelInput] = useState("")
  const [showCustomLabelInput, setShowCustomLabelInput] = useState(false)
  const { t, language } = useLanguage()

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e)
  }

  const title = mode === "create" ? t.newIssue : t.editIssue
  const submitText = mode === "create" ? t.createIssue : t.updateIssue
  const submittingText = mode === "create" ? t.creating : t.updating

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {mode === "create" ? <Plus className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
            {title}
            {mode === "edit" && issue && (
              <Badge variant="outline" className="font-mono ml-2">
                #{issue.iid}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-1">
            <div className="space-y-6 pr-3 pb-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t.issueTitle_}</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={t.issueTitlePlaceholder}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t.issueDescription_}</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={t.issueDescriptionPlaceholder}
                  rows={6}
                />
              </div>

              {/* Status (Column) */}
              <div className="space-y-2">
                <Label>{t.status}</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => {
                    setForm((prev) => ({ ...prev, status: value }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectStatus}>
                      {form.status
                        ? (() => {
                          const column = availableColumns.find((col) => col.id === form.status)
                          return column ? (
                            <div className="flex items-center gap-2">
                              {column.emoji && <span>{column.emoji}</span>}
                              <span>{column.name}</span>
                            </div>
                          ) : (
                            t.selectStatus
                          )
                        })()
                        : t.selectStatus}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        <div className="flex items-center gap-2">
                          {column.emoji && <span>{column.emoji}</span>}
                          <span>{column.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="space-y-2">
                  <Label>{t.startDate}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {form.start_date ? (
                          format(form.start_date, "PPP", { locale: language === "fr" ? fr : enUS })
                        ) : (
                          <span className="text-muted-foreground">{t.selectStartDate}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={form.start_date || undefined}
                        onSelect={(date) => setForm((prev) => ({ ...prev, start_date: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label>{t.dueDate}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                        <Flag className="mr-2 h-4 w-4" />
                        {form.due_date ? (
                          format(form.due_date, "PPP", { locale: language === "fr" ? fr : enUS })
                        ) : (
                          <span className="text-muted-foreground">{t.selectDueDate}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={form.due_date || undefined}
                        onSelect={(date) => setForm((prev) => ({ ...prev, due_date: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Other Labels */}
              {(allNonStatusLabels.length > 0 || showCustomLabelInput) && (
                <div className="space-y-2">
                  <Label>{t.labels}</Label>

                  {/* Selected labels */}
                  {form.labels.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.labels.map((label) => (
                        <Badge key={label} variant="secondary" className="text-xs flex items-center gap-1">
                          {label}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 w-4 h-4 hover:bg-transparent"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                labels: prev.labels.filter((l) => l !== label),
                              }))
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Custom label input */}
                  {showCustomLabelInput && (
                    <div className="flex gap-2 mb-2 items-center">
                      <Input
                        placeholder={t.newLabelPlaceholder}
                        value={customLabelInput}
                        onChange={(e) => setCustomLabelInput(e.target.value)}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            if (customLabelInput.trim() && !form.labels.includes(customLabelInput.trim())) {
                              setForm((prev) => ({
                                ...prev,
                                labels: [...prev.labels, customLabelInput.trim()],
                              }))
                              setCustomLabelInput("")
                              setShowCustomLabelInput(false)
                            }
                          }
                          if (e.key === "Escape") {
                            setCustomLabelInput("")
                            setShowCustomLabelInput(false)
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (customLabelInput.trim() && !form.labels.includes(customLabelInput.trim())) {
                            setForm((prev) => ({
                              ...prev,
                              labels: [...prev.labels, customLabelInput.trim()],
                            }))
                            setCustomLabelInput("")
                            setShowCustomLabelInput(false)
                          }
                        }}
                      >
                        {t.save}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomLabelInput("")
                          setShowCustomLabelInput(false)
                        }}
                      >
                        {t.cancel}
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2 items-center">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value && !form.labels.includes(value)) {
                          setForm((prev) => ({
                            ...prev,
                            labels: [...prev.labels, value],
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={t.addLabel} />
                      </SelectTrigger>
                      <SelectContent>
                        {allNonStatusLabels
                          .filter((label) => !form.labels.includes(label))
                          .map((label) => (
                            <SelectItem key={label} value={label}>
                              {label}
                            </SelectItem>
                          ))}
                        {allNonStatusLabels.filter((label) => !form.labels.includes(label)).length === 0 && (
                          <div className="px-3 py-2 text-gray-500 text-sm">{t.allLabelsSelected}</div>
                        )}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomLabelInput(true)}
                      className="whitespace-nowrap flex-shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t.createNewLabel}
                    </Button>
                  </div>
                </div>
              )}

              {/* Assignee */}
              {allAssigneesWithIds.length > 0 && (
                <div className="space-y-2">
                  <Label>{t.assignedTo_}</Label>
                  <Select
                    value={form.assignee_id?.toString() || "none"}
                    onValueChange={(value) => {
                      setForm((prev) => ({
                        ...prev,
                        assignee_id: value === "none" ? null : Number.parseInt(value),
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectAssignee}>
                        {form.assignee_id
                          ? (() => {
                            const assignee = allAssigneesWithIds.find((a) => a.id === form.assignee_id)
                            return assignee ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={assignee.avatar_url || "/placeholder.svg"} alt={assignee.name} />
                                  <AvatarFallback className="text-xs">
                                    {assignee.name
                                      .split(" ")
                                      .map((n: any[]) => n[0])
                                      .join("")
                                      .substring(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{assignee.name}</span>
                              </div>
                            ) : (
                              t.selectAssignee
                            )
                          })()
                          : t.selectAssignee}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t.noAssignee}</SelectItem>
                      {allAssigneesWithIds.map((assignee) => (
                        <SelectItem key={assignee.id} value={assignee.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={assignee.avatar_url || "/placeholder.svg"} alt={assignee.name} />
                              <AvatarFallback className="text-xs">
                                {assignee.name
                                  .split(" ")
                                  .map((n: any[]) => n[0])
                                  .join("")
                                  .substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{assignee.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Actions at bottom, always visible */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4 flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button type="button" disabled={!form.title.trim() || isSubmitting} onClick={handleFormSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {submittingText}
              </>
            ) : (
              <>
                {mode === "create" ? <Plus className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                {submitText}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
