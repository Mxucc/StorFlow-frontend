import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import Backend from "i18next-http-backend";
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import LanguageDetector from "i18next-browser-languagedetector";
import ChainedBackend from "i18next-chained-backend";
import LocalStorageBackend from "i18next-localstorage-backend";
/**
 * 当前入口包的哈希（`/assets/index-<hash>.js`）。
 *
 * 语言包走的是不带哈希的固定路径，而静态资源的 Last-Modified 取自构建时间（同一提交
 * 多次构建不变），浏览器 revalidate 会一直拿到 304 —— 新增词条会长期显示成原始 key
 * （例如 `store.title`）。这里用入口包哈希当版本号：每次发版语言包缓存自动失效并重新拉取。
 */
const bundleVersion = (() => {
  if (typeof document === "undefined") {
    return "";
  }
  const src = Array.from(document.querySelectorAll("script[src]"))
    .map((el) => el.getAttribute("src") ?? "")
    .find((s) => /\/assets\/index-[A-Za-z0-9_-]+\.js/.test(s));
  return src?.match(/index-([A-Za-z0-9_-]+)\.js/)?.[1] ?? "";
})();

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
i18n
  .use(ChainedBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en-US",
    debug: true,
    ns: ["common", "application", "dashboard"],
    load: "currentOnly",
    defaultNS: "application",
    interpolation: {
      escapeValue: false,
    },
    backend: {
      backends: process.env.NODE_ENV === "development" ? [Backend] : [LocalStorageBackend, Backend],
      // backendOptions 与 backends 按索引一一对应（chained-backend 只取 backendOptions[i]）：
      // [0] localStorage 缓存：以入口包哈希作版本号，发版后缓存自动失效；
      // [1] http 后端：语言包 URL 带上入口包哈希，绕开浏览器 / Service Worker 里的旧副本。
      backendOptions: [
        {
          expirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
          defaultVersion: bundleVersion,
        },
        {
          loadPath: `/locales/{{lng}}/{{ns}}.json${bundleVersion ? `?v=${bundleVersion}` : ""}`,
        },
      ],
    },
  });

i18n.on("languageChanged", (lng) => {
  document.documentElement.setAttribute("lang", lng);
});

export const languages = [
  {
    code: "en-US",
    displayName: "English",
  },
  {
    code: "zh-CN",
    displayName: "简体中文",
  },
  {
    code: "zh-TW",
    displayName: "繁體中文",
  },
  {
    code: "ja-JP",
    displayName: "日本語",
  },
  {
    code: "ru-RU",
    displayName: "Русский",
  },
  {
    code: "de-DE",
    displayName: "Deutsch",
  },
  {
    code: "fr-FR",
    displayName: "Français",
  },
  {
    code: "es-ES",
    displayName: "Español",
  },
  {
    code: "pt-BR",
    displayName: "Português",
  },
  {
    code: "it-IT",
    displayName: "Italiano",
  },
  {
    code: "ko-KR",
    displayName: "한국어",
  },
  {
    code: "pl-PL",
    displayName: "Polski",
  },
  {
    code: "ar-AR",
    displayName: "العربية",
  },
];

export default i18n;
