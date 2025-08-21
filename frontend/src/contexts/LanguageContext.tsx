"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "id";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Nav User
    "nav.manageAccount": "Manage Account",
    "nav.settings": "Settings",
    "nav.notifications": "Notifications",
    "nav.logout": "Log out",
    "nav.profile": "Profile",
    
    // Settings
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.appearance": "Appearance",
    "settings.english": "English",
    "settings.indonesian": "Bahasa Indonesia",
    "settings.light": "Light",
    "settings.dark": "Dark",
    "settings.system": "System",
    "settings.save": "Save",
    "settings.cancel": "Cancel",
    
    // Dashboard
    "dashboard.welcome": "Welcome",
    "dashboard.dataFetching": "Data Fetching",
    "dashboard.buildingApp": "Building Your Application",
  },
  id: {
    // Nav User
    "nav.manageAccount": "Kelola Akun",
    "nav.settings": "Pengaturan",
    "nav.notifications": "Notifikasi",
    "nav.logout": "Keluar",
    "nav.profile": "Profil",
    
    // Settings
    "settings.title": "Pengaturan",
    "settings.language": "Bahasa",
    "settings.theme": "Tema",
    "settings.appearance": "Tampilan",
    "settings.english": "English",
    "settings.indonesian": "Bahasa Indonesia",
    "settings.light": "Terang",
    "settings.dark": "Gelap",
    "settings.system": "Sistem",
    "settings.save": "Simpan",
    "settings.cancel": "Batal",
    
    // Dashboard
    "dashboard.welcome": "Selamat Datang",
    "dashboard.dataFetching": "Pengambilan Data",
    "dashboard.buildingApp": "Membangun Aplikasi Anda",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    // Load saved language preference
    const savedLang = localStorage.getItem("preferred-language") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "id")) {
      setLanguageState(savedLang);
    } else {
      // Detect browser language
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("id")) {
        setLanguageState("id");
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("preferred-language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations["en"]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}