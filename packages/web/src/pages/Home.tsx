import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api";
import { LanguagePicker } from "../components/LanguagePicker";
import { EnvelopeAnimation } from "../components/EnvelopeAnimation";
import { CardAnimation } from "../components/CardAnimation";
import { ConfettiEffect } from "../components/ConfettiEffect";
import { CountdownTimer } from "../components/CountdownTimer";

const BIRTHDAY = "2026-04-19T00:00:00";

function isBirthdayOrAfter() {
  return new Date() >= new Date(BIRTHDAY);
}

type Step = "language" | "countdown" | "envelope" | "card" | "final";

export function Home() {
  const { lang, setLang, t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(() => {
    if (!localStorage.getItem("lang")) return "language";
    return isBirthdayOrAfter() ? "envelope" : "countdown";
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    api.gallery.settings().then((data) => setSettings(data.settings)).catch(() => {});
  }, []);

  const message =
    settings[`birthday_message_${lang}`] || settings.birthday_message_en || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 relative overflow-hidden">
      <LanguagePicker className="absolute top-4 right-4 z-40" />

      {showConfetti && <ConfettiEffect />}

      <AnimatePresence mode="wait">
        {step === "language" && (
          <motion.div
            key="language"
            className="flex flex-col items-center justify-center min-h-screen gap-8"
            exit={{ opacity: 0 }}
          >
            <h2 className="text-2xl text-white font-bold">Choose your language</h2>
            <div className="flex gap-4">
              {[
                { code: "fa" as const, label: "فارسی", flag: "🇮🇷" },
                { code: "nb" as const, label: "Norsk", flag: "🇳🇴" },
                { code: "en" as const, label: "English", flag: "🇬🇧" },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    setStep(isBirthdayOrAfter() ? "envelope" : "countdown");
                  }}
                  className="px-6 py-4 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-colors text-lg"
                >
                  <span className="text-3xl block mb-2">{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "countdown" && (
          <motion.div
            key="countdown"
            className="flex flex-col items-center justify-center min-h-screen gap-8 px-4"
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2">
                🎂 Gandom 🎂
              </h1>
              <p className="text-xl text-white/80">{t("age_text")}</p>
            </motion.div>

            <CountdownTimer targetDate={BIRTHDAY} />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex gap-4 mt-4"
            >
              <button
                onClick={() => navigate(user ? "/upload" : "/login")}
                className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-full font-bold hover:bg-white/30 transition-colors"
              >
                {t("send_wish")}
              </button>
            </motion.div>
          </motion.div>
        )}

        {step === "envelope" && (
          <motion.div key="envelope" exit={{ opacity: 0, scale: 0.8 }}>
            <EnvelopeAnimation onOpen={() => setStep("card")} />
          </motion.div>
        )}

        {step === "card" && (
          <motion.div key="card" exit={{ opacity: 0 }}>
            <CardAnimation
              message={message}
              onComplete={() => {
                setShowConfetti(true);
                setTimeout(() => setStep("final"), 500);
              }}
            />
          </motion.div>
        )}

        {step === "final" && (
          <motion.div
            key="final"
            className="flex flex-col items-center justify-center min-h-screen gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.h1
              className="text-5xl font-extrabold text-white text-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
            >
              {t("birthday_greeting")}
            </motion.h1>

            <div className="flex gap-4 mt-8">
              <motion.button
                className="px-8 py-3 bg-white text-purple-600 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-shadow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(user ? "/gallery" : "/login")}
              >
                {t("see_wishes")}
              </motion.button>
              <motion.button
                className="px-8 py-3 bg-purple-700 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-shadow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(user ? "/upload" : "/login")}
              >
                {t("send_wish")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
