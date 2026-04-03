import { useI18n } from "../i18n/I18nContext";

const langs = [
  { code: "fa" as const, label: "فارسی", flag: "🇮🇷" },
  { code: "nb" as const, label: "Norsk", flag: "🇳🇴" },
  { code: "en" as const, label: "English", flag: "🇬🇧" },
];

type Props = {
  className?: string;
  variant?: "dark" | "light";
};

export function LanguagePicker({ className = "", variant = "dark" }: Props) {
  const { lang, setLang } = useI18n();

  const styles =
    variant === "dark"
      ? "bg-white/20 text-white border-white/30 hover:bg-white/30 focus:ring-white/50"
      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-purple-400";

  const arrowColor = variant === "dark" ? "text-white/70" : "text-gray-400";

  return (
    <div className={`relative ${className}`}>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as typeof lang)}
        className={`appearance-none backdrop-blur-sm border rounded-lg px-3 py-1.5 pr-8 text-sm cursor-pointer transition-colors focus:outline-none focus:ring-2 ${styles}`}
      >
        {langs.map((l) => (
          <option key={l.code} value={l.code} className="text-gray-900 bg-white">
            {l.flag} {l.label}
          </option>
        ))}
      </select>
      <div className={`pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs ${arrowColor}`}>
        ▼
      </div>
    </div>
  );
}
