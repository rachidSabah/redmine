"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { en, TranslationKeys } from './translations/en';
import frTranslations from './translations/fr';

export type Language = 'en' | 'fr';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: TranslationKeys;
}

const I18nContext = createContext<I18nContextType | undefined>({
  language: 'en',
  setLanguage: () => {},
  t: () => '',
  translations: en,
});

// Get nested value from translation object
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let result: unknown = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && result !== null && key in result) {
      result = (result as Record<string, unknown>)[key];
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

export function I18nProvider({ children }: { children: ReactNode }) {
  const [currentLang, setCurrentLang] = useState<Language>('en');

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') as Language;
      if (savedLang && (savedLang === 'en' || savedLang === 'fr')) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentLang(savedLang);
        document.documentElement.lang = savedLang;
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setCurrentLang(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
      document.documentElement.lang = lang;
    }
  };

  const translations = currentLang === 'fr' ? frTranslations : en;

  const t = (key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(translations as unknown as Record<string, unknown>, key);
    if (!value) {
      return key;
    }
    return interpolate(value, params);
  };

  return (
    <I18nContext.Provider value={{ language: currentLang, setLanguage, t, translations }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Hook for getting translation function
export function useTranslation() {
  const { t, language } = useI18n();
  return { t, language };
}

// Server-side translation function
export function getTranslation(lang: Language = 'en', key: string, params?: Record<string, string | number>): string {
  const translations = lang === 'fr' ? frTranslations : en;
  const value = getNestedValue(translations as unknown as Record<string, unknown>, key);
  if (!value) {
    return key;
  }
  return interpolate(value, params);
}

export { I18nContext };
