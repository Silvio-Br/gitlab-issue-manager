"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe, Check } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

interface LanguageSelectorProps {
  variant?: "default" | "sidebar"
  collapsed?: boolean
}

export function LanguageSelector({ variant = "default", collapsed = false }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
  ]

  const currentLanguage = languages.find((lang) => lang.code === language) || languages[0]

  if (variant === "sidebar") {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`${collapsed ? "w-8 h-8 p-0 flex items-center justify-center" : "w-full justify-center flex items-center"}`}
            title={collapsed ? currentLanguage.name : undefined}
          >
            <Globe className="w-4 h-4" />
            {!collapsed && <span className="ml-2">{currentLanguage.name}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code as "en" | "fr")
                setIsOpen(false)
              }}
              className="flex items-center gap-2"
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              {language === lang.code && <Check className="w-4 h-4 ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Default variant for other uses
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-gray-500" />
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <span className="mr-1">{currentLanguage.flag}</span>
            {currentLanguage.name}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code as "en" | "fr")
                setIsOpen(false)
              }}
              className="flex items-center gap-2"
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              {language === lang.code && <Check className="w-4 h-4 ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
