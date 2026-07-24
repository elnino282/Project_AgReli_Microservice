/**
 * Shared i18n hook.
 *
 * Provides the same API as the legacy hook from src/hooks/useI18n while living
 * in the shared layer for new FSD-compliant imports.
 */

import {
  changeLanguage,
  getCurrentLocale,
  LANGUAGE_DISPLAY_NAMES,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/i18n";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface UseI18nReturn {
  t: (key: string, optionsOrDefault?: Record<string, unknown> | string) => string;
  locale: SupportedLocale;
  languageCode: string;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  supportedLocales: readonly SupportedLocale[];
  localeDisplayNames: typeof LANGUAGE_DISPLAY_NAMES;
  isLoading: boolean;
}

export function useI18n(): UseI18nReturn {
  const { t: i18nT, i18n, ready } = useTranslation();

  const locale = useMemo(() => getCurrentLocale(), [i18n?.language]);

  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    await changeLanguage(newLocale);
  }, []);

  const t = useCallback(
    (key: string, optionsOrDefault?: Record<string, unknown> | string) => {
      if (typeof optionsOrDefault === "string") {
        return i18nT(key, { defaultValue: optionsOrDefault });
      }
      return i18nT(key, optionsOrDefault);
    },
    [i18nT],
  );

  return {
    t,
    locale,
    languageCode: i18n?.language || "vi",
    setLocale,
    supportedLocales: SUPPORTED_LOCALES,
    localeDisplayNames: LANGUAGE_DISPLAY_NAMES,
    isLoading: ready === false,
  };
}

export function useFormatters() {
  const { locale } = useI18n();

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(locale, options).format(value);
    },
    [locale],
  );

  const formatCurrency = useCallback(
    (value: number, currency: string = "VND") => {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: currency === "VND" ? 0 : 2,
        maximumFractionDigits: currency === "VND" ? 0 : 2,
      }).format(value);
    },
    [locale],
  );

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      const dateObj =
        typeof date === "string" || typeof date === "number" ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, options).format(dateObj);
    },
    [locale],
  );

  const formatRelativeTime = useCallback(
    (value: number, unit: Intl.RelativeTimeFormatUnit) => {
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
    },
    [locale],
  );

  const formatWeight = useCallback(
    (value: number, unit: "KG" | "G" | "TON") => {
      const unitMap = { KG: "kg", G: "g", TON: "t" };
      return `${formatNumber(value)} ${unitMap[unit]}`;
    },
    [formatNumber],
  );

  return {
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelativeTime,
    formatWeight,
  };
}
