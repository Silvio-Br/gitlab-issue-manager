"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { type Language, translations, type Translations } from "@/lib/i18n"
import { secureStorage } from "@/lib/secure-storage"

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  // Load saved language from database on mount
  useEffect(() => {
    const loadLanguage = () => {
      try {
        const savedLanguage = secureStorage.getLanguage()
        if (savedLanguage === "en" || savedLanguage === "fr") {
          setLanguageState(savedLanguage as Language)
        }
      } catch (error) {
        console.error("Failed to load language:", error)
      }
    }

    loadLanguage()
  }, [])

  const setLanguage = (newLanguage: Language) => {
    try {
      setLanguageState(newLanguage)
      secureStorage.saveLanguage(newLanguage)
    } catch (error) {
      console.error("Failed to save language:", error)
    }
  }

  const t = translations[language]

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
