import { useI18n } from "../i18n/I18nContext";

export function LanguagePicker({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();

  const langs = [
    { code: "fa" as const, label: "فارسی", flag: "🇮🇷" },
    { code: "nb" as const, label: "Norsk", flag: "🇳🇴" },
    { code: "en" as const, label: "English", flag: "🇬🇧" },
  ];

  return (
    <div className={`flex gap-2 ${className}`}>
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            lang === l.code
              ? "bg-pink-500 text-white"
              : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}
