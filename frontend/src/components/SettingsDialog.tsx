"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Languages, Moon, Sun, Monitor } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  
  // Store temporary values
  const [tempTheme, setTempTheme] = useState(theme);
  const [tempLanguage, setTempLanguage] = useState(language);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Reset temp values when dialog opens
    if (open) {
      setTempTheme(theme);
      setTempLanguage(language);
    }
  }, [open, theme, language]);

  if (!mounted) {
    return null;
  }

  const handleSave = () => {
    setTheme(tempTheme || "system");
    setLanguage(tempLanguage);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to original values
    setTempTheme(theme);
    setTempLanguage(language);
    onOpenChange(false);
  };

  const themeOptions = [
    { value: "light", label: t("settings.light"), icon: Sun },
    { value: "dark", label: t("settings.dark"), icon: Moon },
    { value: "system", label: t("settings.system"), icon: Monitor },
  ];

  const languageOptions = [
    { value: "en", label: t("settings.english"), flag: "🇬🇧" },
    { value: "id", label: t("settings.indonesian"), flag: "🇮🇩" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("settings.title")}
          </DialogTitle>
          <DialogDescription>
            {t("settings.appearance")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Language Selection */}
          <div className="grid gap-2">
            <Label htmlFor="language" className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              {t("settings.language")}
            </Label>
            <Select value={tempLanguage} onValueChange={setTempLanguage}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{option.flag}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Theme Selection */}
          <div className="grid gap-2">
            <Label htmlFor="theme" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              {t("settings.theme")}
            </Label>
            <Select value={tempTheme} onValueChange={setTempTheme}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Theme Preview */}
          <div className="grid gap-2">
            <Label className="text-sm text-muted-foreground">Preview</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-lg border p-4 ${tempTheme === 'light' ? 'bg-white text-black' : tempTheme === 'dark' ? 'bg-gray-900 text-white' : ''}`}>
                <div className="text-sm font-medium mb-1">Light Mode</div>
                <div className="text-xs opacity-70">Preview text</div>
              </div>
              <div className={`rounded-lg border p-4 ${tempTheme === 'dark' ? 'bg-gray-900 text-white border-gray-700' : tempTheme === 'light' ? 'bg-white text-black' : ''}`}>
                <div className="text-sm font-medium mb-1">Dark Mode</div>
                <div className="text-xs opacity-70">Preview text</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t("settings.cancel")}
          </Button>
          <Button onClick={handleSave}>
            {t("settings.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Import Settings icon at the top of the file
import { Settings } from "lucide-react";