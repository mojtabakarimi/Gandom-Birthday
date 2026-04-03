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

type Step = "language" | "envelope" | "card" | "final";

export function Home() {
  const { lang, setLang, t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(() =>
    localStorage.getItem("lang") ? "envelope" : "language"
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    api.gallery.settings().then((data) => setSettings(data.settings)).catch(() => {});
  }, []);

  const message =
    settings[`birthday_message_${lang}`] || settings.birthday_message_en || "";

  const isCountdown = settings.mode === "countdown";

  if (isCountdown) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex flex-col items-center justify-center p-4">
        <LanguagePicker className="absolute top-4 right-4" />
        <CountdownTimer targetDate={settings.birthday_date || ""} />
      </div>
    );
  }

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
                { code: "fa" as const, label: "\u0641\u0627\u0631\u0633\u06CC", flag: "\uD83C\uDDEE\uD83C\uDDF7" },
                { code: "nb" as const, label: "Norsk", flag: "\uD83C\uDDF3\uD83C\uDDF4" },
                { code: "en" as const, label: "English", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    setStep("envelope");
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
