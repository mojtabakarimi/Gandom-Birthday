import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../auth/AuthContext";
import { GalleryGrid } from "../components/GalleryGrid";
import { MobileMenu } from "../components/MobileMenu";

export function Gallery() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.gallery
      .list()
      .then((data) => setItems(data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const menuItems = [
    { label: t("send_wish"), onClick: () => navigate("/upload") },
    ...(user?.role === "admin"
      ? [{ label: "Admin", onClick: () => navigate("/admin") }]
      : []),
    { label: t("logout"), onClick: async () => { await logout(); navigate("/"); }, variant: "danger" as const },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-purple-700">
            {t("gallery_title")}
          </h1>
          <MobileMenu items={menuItems} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-500 text-lg mt-16">
            {t("no_wishes_yet")}
          </p>
        ) : (
          <GalleryGrid items={items} />
        )}
      </main>
    </div>
  );
}
