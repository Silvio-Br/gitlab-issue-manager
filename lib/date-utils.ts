// Utility functions for date handling and formatting

export const getDueDateColor = (dueDate: string) => {
  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    // Overdue - Red
    return {
      textColor: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      icon: "text-red-500",
    }
  } else if (diffDays <= 1) {
    // Due today or tomorrow - Orange
    return {
      textColor: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      icon: "text-orange-500",
    }
  } else if (diffDays <= 3) {
    // Due in 2-3 days - Amber
    return {
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      icon: "text-amber-500",
    }
  } else if (diffDays <= 7) {
    // Due in a week - Yellow
    return {
      textColor: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      icon: "text-yellow-500",
    }
  } else {
    // Not urgent - Green/Normal
    return {
      textColor: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      icon: "text-green-500",
    }
  }
}

export const getDueDateLabel = (dueDate: string, t: any) => {
  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays)
    return `${t.overdueDays} ${overdueDays} ${overdueDays > 1 ? t.days : t.day}`
  } else if (diffDays === 0) {
    return t.dueToday
  } else if (diffDays === 1) {
    return t.dueTomorrow
  } else {
    return `${t.dueInDays} ${diffDays} ${diffDays > 1 ? t.days : t.day}`
  }
}
