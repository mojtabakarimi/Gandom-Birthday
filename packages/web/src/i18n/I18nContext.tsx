import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import en from "./en.json";
import fa from "./fa.json";
import nb from "./nb.json";

type Lang = "en" | "fa" | "nb";
type Translations = typeof en;

const translations: Record<Lang, Translations> = { en, fa, nb };

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof Translations) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("lang") as Lang) || "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  const dir = lang === "fa" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  const t = (key: keyof Translations) => {
    return translations[lang][key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
