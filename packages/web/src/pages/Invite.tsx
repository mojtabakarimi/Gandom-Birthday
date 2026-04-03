import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { LanguagePicker } from "../components/LanguagePicker";

export function Invite() {
  const { token } = useParams<{ token: string }>();
  const { refresh } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.invites
      .get(token)
      .then((data) => {
        setDisplayName(data.display_name);
        setAlreadyAccepted(data.invite_accepted);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.invites.accept(token!, { username, password });
      await refresh();
      navigate("/gallery");
    } catch (err: any) {
      setError(err.message || "Failed to accept invite");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex items-center justify-center">
        <p className="text-white text-xl">Invite not found.</p>
      </div>
    );
  }

  if (alreadyAccepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex flex-col items-center justify-center gap-4">
        <p className="text-white text-xl">This invite has already been accepted.</p>
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100"
        >
          {t("login")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex flex-col items-center justify-center p-4">
      <LanguagePicker className="absolute top-4 right-4" />
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-purple-700 mb-2">
          {t("welcome")}, {displayName}!
        </h1>
        <p className="text-center text-gray-600 mb-6 text-sm">
          {t("choose_username")} & {t("set_password")}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("username")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "..." : t("accept_invite")}
          </button>
        </form>
      </div>
    </div>
  );
}
