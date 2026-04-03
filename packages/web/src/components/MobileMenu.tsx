import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nContext";

type MenuItem = {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
};

type Props = {
  items: MenuItem[];
};

const langs = [
  { code: "fa" as const, label: "فارسی", flag: "🇮🇷" },
  { code: "nb" as const, label: "Norsk", flag: "🇳🇴" },
  { code: "en" as const, label: "English", flag: "🇬🇧" },
];

export function MobileMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const { lang, setLang } = useI18n();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Menu"
      >
        {open ? (
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-12 z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-[200px]" style={{ insetInlineEnd: 0 }}>
            {/* Language section */}
            <div className="px-4 py-2 border-b border-gray-100" dir="ltr">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Language</p>
              <div className="flex gap-1">
                {langs.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setOpen(false);
                    }}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs text-center transition-colors ${
                      lang === l.code
                        ? "bg-purple-100 text-purple-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu items */}
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${
                  item.variant === "danger"
                    ? "text-red-600 hover:bg-red-50"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
