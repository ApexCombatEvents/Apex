"use client";

import { useState, useEffect } from 'react';
import en from '../messages/en.json';
import es from '../messages/es.json';
import pt from '../messages/pt.json';
import fr from '../messages/fr.json';
import de from '../messages/de.json';
import { ALL_LANGUAGES } from '@/lib/languages';

const translations: Record<string, any> = { 
  en, 
  es, 
  pt, 
  fr, 
  de 
};

export type Language = string;

export function useTranslation() {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    // 1. Check local storage
    const savedLang = localStorage.getItem('language');
    let initialLang: string = 'en';

    if (savedLang) {
      initialLang = savedLang;
    } else {
      // 2. Check browser language
      const browserLang = navigator.language.split('-')[0];
      initialLang = browserLang;
    }

    setLangState(initialLang);

    // Apply to Google Translate on load
    const interval = setInterval(() => {
      const googleTranslateCombo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (googleTranslateCombo) {
        if (googleTranslateCombo.value !== initialLang) {
          googleTranslateCombo.value = initialLang;
          googleTranslateCombo.dispatchEvent(new Event('change'));
        }
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const setLang = (newLang: string) => {
    setLangState(newLang);
    localStorage.setItem('language', newLang);
    
    // Set Google Translate cookie
    if (typeof window !== 'undefined') {
      const cookieValue = `/en/${newLang}`;
      document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname}`;
      document.cookie = `googtrans=${cookieValue}; path=/`;
      
      // Also try to trigger the dropdown if it's already on the page
      const googleTranslateCombo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (googleTranslateCombo) {
        googleTranslateCombo.value = newLang;
        googleTranslateCombo.dispatchEvent(new Event('change'));
      }

      // Reload to ensure everything is translated correctly (Google Translate works best on full page loads)
      window.location.reload();
    }

    // Trigger a storage event for other tabs/components
    window.dispatchEvent(new Event('storage'));
  };

  const t = (key: string) => {
    const keys = key.split('.');
    
    const getNestedValue = (obj: any, path: string[]) => {
      let current = obj;
      for (const k of path) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          return null;
        }
      }
      return typeof current === 'string' ? current : null;
    };

    // 1. Try current language
    let value = getNestedValue(translations[lang], keys);
    if (value) return value;

    // 2. Fallback to English
    let fallback = getNestedValue(translations['en'], keys);
    if (fallback) return fallback;

    // 3. Last resort: Return the key (this is what Google Translate will see and translate)
    return key;
  };

  return { t, lang, setLang };
}
