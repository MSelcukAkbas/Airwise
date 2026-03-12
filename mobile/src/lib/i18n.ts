import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from '../i18n/locales/en.json';
import tr from '../i18n/locales/tr.json';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: Localization.getLocales()[0]?.languageCode || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4', // Required for React Native / Expo
  });

export default i18n;
