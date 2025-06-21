"use client"

import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/contexts/language-context"

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Languages className="w-4 h-4 mr-2" />
          {t.language}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => setLanguage("en")} className={language === "en" ? "bg-accent" : ""}>
          🇺🇸 {t.english}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("fr")} className={language === "fr" ? "bg-accent" : ""}>
          🇫🇷 {t.french}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
