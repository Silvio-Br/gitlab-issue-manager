"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { GitlabIcon as GitLab, Info, ExternalLink, ArrowRight, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLanguage } from "@/contexts/language-context"
import { useGitLabConfig } from "@/hooks/use-secure-storage"

export default function ConfigurationPage() {
  const [token, setToken] = useState("")
  const [gitlabUrl, setGitlabUrl] = useState("https://gitlab.com")
  const [isValid, setIsValid] = useState(false)
  const [testing, setTesting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isReconfigure = searchParams.get("reconfigure") === "true"
  const { t } = useLanguage()
  const { config, loading, saveConfig } = useGitLabConfig()

  // Load existing configuration if in reconfigure mode
  useEffect(() => {
    if (isReconfigure && config && !loading) {
      setToken(config.token)
      setGitlabUrl(config.gitlabUrl)
      setIsValid(true)
    }
  }, [isReconfigure, config, loading])

  const testConnection = async () => {
    if (!token || !gitlabUrl) return

    setTesting(true)
    try {
      const baseUrl =
        gitlabUrl === "https://gitlab.com" ? "https://gitlab.com/api/v4" : `${gitlabUrl.replace(/\/$/, "")}/api/v4`

      const response = await fetch(`${baseUrl}/user`, {
        headers: {
          "PRIVATE-TOKEN": token,
        },
      })

      if (response.ok) {
        setIsValid(true)
      } else {
        setIsValid(false)
        alert("Connection error. Check your token and URL.")
      }
    } catch (_) {
      setIsValid(false)
      alert("Connection error. Check your GitLab URL.")
    } finally {
      setTesting(false)
    }
  }

  const handleNext = async () => {
    if (isValid) {
      try {
        await saveConfig({ token, gitlabUrl })
        if (isReconfigure) {
          router.push("/dashboard")
        } else {
          router.push("/projects")
        }
      } catch (error) {
        console.error("Failed to save configuration:", error)
        alert("Failed to save configuration. Please try again.")
      }
    }
  }

  const handleAbort = () => {
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>{t.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <GitLab className="w-16 h-16 text-orange-500" />
          </div>
          <CardTitle className="text-3xl">{isReconfigure ? t.gitlabReconfiguration : t.gitlabConfiguration}</CardTitle>
          <p className="text-gray-600">{isReconfigure ? t.modifyGitlabConfiguration : t.configureGitlabConnection}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="gitlabUrl">{t.gitlabInstanceUrl}</Label>
            <Input
              id="gitlabUrl"
              placeholder="https://gitlab.com"
              value={gitlabUrl}
              onChange={(e) => {
                setGitlabUrl(e.target.value)
                setIsValid(false)
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Pour les instances GitLab auto-hébergées (ex: https://my.gitlab.com)
            </p>
          </div>

          <div>
            <Label htmlFor="token">{t.personalAccessToken} *</Label>
            <Input
              id="token"
              type="password"
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => {
                setToken(e.target.value)
                setIsValid(false)
              }}
            />
            <div className="mt-2 space-y-2">
              <p className="text-xs text-gray-500">{t.tokenRequired}</p>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>{t.howToCreateToken}</strong>
                  <br />
                  1. Allez dans GitLab → Préférences → Tokens d'accès
                  <br />
                  2. Créez un nouveau token avec les scopes : <code className="bg-gray-100 px-1 rounded">api</code>,{" "}
                  <code className="bg-gray-100 px-1 rounded">read_user</code>
                  <br />
                  3. Copiez la valeur complète (commence par <code className="bg-gray-100 px-1 rounded">glpat-</code>)
                </AlertDescription>
              </Alert>

              {/* Documentation link */}
              <div className="text-center mt-3">
                <Button variant="link" size="sm" asChild className="text-xs">
                  <a
                    href="https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t.gitlabDocumentation}
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={testConnection}
              disabled={!token || !gitlabUrl || testing}
              className="w-full"
              variant={isValid ? "default" : "outline"}
            >
              {testing ? t.connectionTesting : isValid ? t.connectionSuccessful : t.testConnection}
            </Button>

            <div className="flex gap-2">
              {isReconfigure && (
                <Button onClick={handleAbort} variant="outline" className="flex-1">
                  <X className="w-4 h-4 mr-2" />
                  {t.abort}
                </Button>
              )}

              {isValid && (
                <Button onClick={handleNext} className="flex-1">
                  {isReconfigure ? t.save : t.continue}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
