import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhTranslation from './locales/zh/translation.json';
import enTranslation from './locales/en/translation.json';
import classicalChineseTranslation from './locales/classical_chinese/translation.json';
import jaTranslation from './locales/ja/translation.json';
import koTranslation from './locales/ko/translation.json';
import twTranslation from './locales/zh-TW/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh', 'classical_chinese', 'ja', 'ko', 'zh-TW'],
    resources: {
      en: {
        translation: enTranslation,
      },
      zh: {
        translation: zhTranslation,
      },
      classical_chinese: {
        translation: classicalChineseTranslation,
      },
      ja: {
        translation: jaTranslation,
      },
      ko: {
        translation: koTranslation,
      },
      'zh-TW': {
        translation: twTranslation,
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;