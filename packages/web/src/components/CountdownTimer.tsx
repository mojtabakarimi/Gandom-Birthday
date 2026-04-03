import { useState, useEffect } from "react";
import { useI18n } from "../i18n/I18nContext";

type Props = { targetDate: string };

export function CountdownTimer({ targetDate }: Props) {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.total <= 0) return null;

  const units = [
    { value: timeLeft.days, label: t("days") },
    { value: timeLeft.hours, label: t("hours") },
    { value: timeLeft.minutes, label: t("minutes") },
    { value: timeLeft.seconds, label: t("seconds") },
  ];

  return (
    <div className="text-center">
      <h2 className="text-2xl text-white/90 mb-6">{t("countdown_title")}</h2>
      <div className="flex gap-4 justify-center">
        {units.map((u) => (
          <div
            key={u.label}
            className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[80px]"
          >
            <div className="text-4xl font-bold text-white">
              {String(u.value).padStart(2, "0")}
            </div>
            <div className="text-white/70 text-sm mt-1">{u.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTimeLeft(target: string) {
  const total = new Date(target).getTime() - Date.now();
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}
