"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "./ui/switch";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      <Sun className={`h-4 w-4 transition-colors`} />
      <Switch />
      <Moon className={`h-4 w-4 transition-colors`} />
    </div>
  );
}
