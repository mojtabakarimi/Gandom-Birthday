import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../auth/AuthContext";
import { UploadForm } from "../components/UploadForm";
import { LanguagePicker } from "../components/LanguagePicker";

export function Upload() {
  const { t } = useI18n();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [myUploads, setMyUploads] = useState<any[]>([]);
  const [success, setSuccess] = useState(false);

  const loadMyUploads = () => {
    api.uploads.mine().then((data) => setMyUploads(data.uploads)).catch(() => {});
  };

  useEffect(() => {
    loadMyUploads();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl font-bold text-purple-700 shrink-0">
              {t("upload_title")}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <LanguagePicker variant="light" />
              <button
                onClick={() => navigate("/gallery")}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs sm:text-sm whitespace-nowrap"
              >
                {t("see_wishes")}
              </button>
              <button
                onClick={async () => { await logout(); navigate("/"); }}
                className="text-gray-500 hover:text-gray-700 text-xs sm:text-sm whitespace-nowrap"
              >
                {t("logout")}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {success && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg text-center">
            {t("upload_success")}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <UploadForm
            onSuccess={() => {
              setSuccess(true);
              loadMyUploads();
              setTimeout(() => setSuccess(false), 5000);
            }}
          />
        </div>

        {myUploads.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {t("my_uploads")}
            </h2>
            <div className="space-y-3">
              {myUploads.map((u) => (
                <div
                  key={u.id}
                  className="bg-white rounded-lg shadow p-4 flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {u.media_type === "image" ? (
                      <img
                        src={api.gallery.fileUrl(u.thumbnail_key || u.file_key)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                        ▶
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {u.caption && (
                      <p className="text-sm text-gray-700 truncate">
                        {u.caption}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(u.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                      u.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : u.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {u.status === "pending" ? t("pending_notice") : u.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
