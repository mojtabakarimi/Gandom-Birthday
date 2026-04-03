import { motion } from "framer-motion";
import { useI18n } from "../i18n/I18nContext";

type Props = {
  message: string;
  onComplete: () => void;
};

export function CardAnimation({ message, onComplete }: Props) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <motion.div
        className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        initial={{ y: 100, opacity: 0, rotateX: 90 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        <motion.h1
          className="text-4xl font-bold text-purple-700 mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          {t("birthday_greeting")}
        </motion.h1>

        <motion.div
          className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 my-6"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 150 }}
        >
          6
        </motion.div>

        <motion.p
          className="text-xl text-purple-600 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {t("age_text")}
        </motion.p>

        <motion.p
          className="text-lg text-gray-600 mt-6 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          onAnimationComplete={onComplete}
        >
          {message}
        </motion.p>
      </motion.div>
    </div>
  );
}
