import { motion } from "framer-motion";
import { useI18n } from "../i18n/I18nContext";

type Props = { onOpen: () => void };

export function EnvelopeAnimation({ onOpen }: Props) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-yellow-300/60"
          initial={{
            x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 800),
            y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 600),
          }}
          animate={{
            y: [null, Math.random() * -200],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}

      <motion.div
        className="cursor-pointer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onOpen}
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {/* Envelope */}
        <div className="relative w-72 h-48 bg-gradient-to-br from-pink-200 to-pink-300 rounded-lg shadow-2xl flex items-center justify-center border-2 border-pink-400">
          {/* Flap */}
          <div className="absolute -top-12 left-0 right-0 h-24 overflow-hidden">
            <div
              className="w-full h-full bg-gradient-to-br from-pink-300 to-pink-400 border-2 border-pink-400"
              style={{
                clipPath: "polygon(0 100%, 50% 0%, 100% 100%)",
              }}
            />
          </div>
          {/* Name */}
          <span className="text-3xl font-bold text-pink-700 z-10">
            Gandom
          </span>
          {/* Heart seal */}
          <motion.div
            className="absolute -top-2 left-1/2 -translate-x-1/2 text-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {"\uD83D\uDC96"}
          </motion.div>
        </div>
      </motion.div>

      <motion.p
        className="mt-8 text-white/80 text-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {t("tap_to_open")}
      </motion.p>
    </div>
  );
}
