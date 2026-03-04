"use client";

import { useAppStore } from "@/store/app-store";
import { en, fr, TranslationKeys } from "./translations/en";
import frTranslations from "./translations/fr";

export type Language = 'en' | 'fr';

// Get nested value from translation object
function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return undefined;
    }
  }
  return typeof result === 'string' ? result : undefined;
}

// Interpolate string with params
function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return Object.entries(params).reduce(
    (s, [key, value]) => s.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    str
  );
}

export function useTranslation() {
  const language = useAppStore((state) => state.language);
  const setStoreLanguage = useAppStore((state) => state.setLanguage);
  
  const translations: TranslationKeys = language === 'fr' ? frTranslations : en;

  const t = (key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(translations, key);
    if (!value) {
      // Fallback to key for missing translations
      return key;
    }
    return interpolate(value, params);
  };

  const setLanguage = (lang: Language) => {
    setStoreLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
      document.documentElement.lang = lang;
    }
  };

  return { t, language: language || 'en', setLanguage, translations };
}

// Server-side translation function
export function getTranslation(lang: Language = 'en', key: string, params?: Record<string, string | number>): string {
  const translations = lang === 'fr' ? frTranslations : en;
  const value = getNestedValue(translations, key);
  if (!value) {
    return key;
  }
  return interpolate(value, params);
}
