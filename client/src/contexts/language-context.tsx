import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type SupportedLanguage, getTranslation } from "@/lib/i18n";
import type { UserSettings } from "@shared/schema";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
  autoDetectLanguage: boolean;
  setAutoDetectLanguage: (enabled: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [autoDetectLanguage, setAutoDetectLanguageState] = useState(true);

  // Fetch user settings to get saved language preferences
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  // Update language when settings load
  useEffect(() => {
    if (settings) {
      setLanguageState(settings.language as SupportedLanguage);
      setAutoDetectLanguageState(settings.autoDetectLanguage);
    }
  }, [settings]);

  const setLanguage = async (lang: SupportedLanguage) => {
    setLanguageState(lang);
    
    // Update user settings
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
    } catch (error) {
      console.error("Failed to update language setting:", error);
    }
  };

  const setAutoDetectLanguage = async (enabled: boolean) => {
    setAutoDetectLanguageState(enabled);
    
    // Update user settings
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoDetectLanguage: enabled }),
      });
    } catch (error) {
      console.error("Failed to update auto-detect language setting:", error);
    }
  };

  const t = (key: string) => getTranslation(language, key);

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, autoDetectLanguage, setAutoDetectLanguage }}
    >
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