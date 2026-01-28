"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Globe } from "lucide-react"
import { locales, localeNames, type Locale } from "@/i18n/config"
import { FlagIcons } from "@/components/icons/flags"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface LanguageSwitcherProps {
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg" | "icon"
  showLabel?: boolean
  className?: string
}

export function LanguageSwitcher({
  variant = "ghost",
  size = "icon",
  showLabel = false,
  className,
}: LanguageSwitcherProps) {
  const router = useRouter()

  // Use state to avoid hydration mismatch
  // Initial value must match server render (null = don't show label until mounted)
  const [currentLocale, setCurrentLocale] = useState<Locale | null>(null)
  const [mounted, setMounted] = useState(false)

  // Read locale from cookie after component mounts (client-side only)
  useEffect(() => {
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/)
    const locale = (match?.[1] as Locale) || "id"
    setCurrentLocale(locale)
    setMounted(true)
  }, [])

  const handleLocaleChange = (newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
    setCurrentLocale(newLocale)
    router.refresh()
  }

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Globe className="h-4 w-4" />
        {showLabel && <span className="ml-2 w-16" />}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {currentLocale ? (
            (() => {
              const FlagIcon = FlagIcons[currentLocale]
              return <FlagIcon className="h-4 w-6" />
            })()
          ) : (
            <Globe className="h-4 w-4" />
          )}
          {showLabel && currentLocale && (
            <span className="ml-2">{localeNames[currentLocale]}</span>
          )}
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => {
          const FlagIcon = FlagIcons[locale]
          return (
            <DropdownMenuItem
              key={locale}
              onClick={() => handleLocaleChange(locale)}
              className={locale === currentLocale ? "bg-accent" : ""}
            >
              <FlagIcon className="h-4 w-6" />
              {localeNames[locale]}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
