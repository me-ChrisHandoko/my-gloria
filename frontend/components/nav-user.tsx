"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"
import {
  ChevronsUpDown,
  Globe,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Sun,
} from "lucide-react"
import { locales, localeNames, type Locale } from "@/i18n/config"
import { FlagIcons } from "@/components/icons/flags"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks"
import { useLogoutMutation } from "@/lib/store/services/authApi"
import { logout as logoutAction } from "@/lib/store/features/authSlice"
import { clearRbac } from "@/lib/store/features/rbacSlice"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [logout] = useLogoutMutation()
  const { setTheme } = useTheme()
  const t = useTranslations("NavUser")

  // Handle locale change
  const handleLocaleChange = (newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
    router.refresh()
  }

  // Generate initials from name (first letter of first word + first letter of last word)
  const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/)
    if (words.length === 0) return "U"
    if (words.length === 1) return words[0].charAt(0).toUpperCase()
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
  }

  const initials = getInitials(user.name)

  const handleLogout = async () => {
    try {
      // Call backend logout (refresh_token sent via httpOnly cookie)
      await logout().unwrap()
    } catch (error) {
      // Ignore errors - logout locally anyway
      console.error('Logout failed:', error)
    } finally {
      dispatch(logoutAction())
      // Clear RBAC state (modules, permissions, cache)
      dispatch(clearRbac())
      router.push("/login")
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/change-password")}>
                <KeyRound />
                {t("changePassword")}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette />
                  {t("mode")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon />
                    {t("dark")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun />
                    {t("light")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor />
                    {t("system")}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Globe />
                  {t("language")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {locales.map((locale) => {
                    const FlagIcon = FlagIcons[locale]
                    return (
                      <DropdownMenuItem
                        key={locale}
                        onClick={() => handleLocaleChange(locale)}
                      >
                        <FlagIcon className="h-4 w-6" />
                        {localeNames[locale]}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
