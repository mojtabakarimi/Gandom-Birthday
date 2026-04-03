import { useState, useEffect } from "react";
import { api } from "../../api";

export function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.admin.settings().then((d) => setSettings(d.settings)).catch(() => {});
  }, []);

  const update = (key: string, value: string) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { settings: updated } = await api.admin.updateSettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Site Settings</h2>
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Birthday Messages</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">English</label>
              <textarea value={settings.birthday_message_en || ""} onChange={(e) => update("birthday_message_en", e.target.value)} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">فارسی (Persian)</label>
              <textarea value={settings.birthday_message_fa || ""} onChange={(e) => update("birthday_message_fa", e.target.value)} rows={2} dir="rtl" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Norsk (Norwegian)</label>
              <textarea value={settings.birthday_message_nb || ""} onChange={(e) => update("birthday_message_nb", e.target.value)} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Display Mode</h3>
          <select value={settings.mode || "animation"} onChange={(e) => update("mode", e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
            <option value="animation">Birthday Animation</option>
            <option value="countdown">Countdown Timer</option>
          </select>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Upload Limits</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Max file size (MB)</label>
              <input type="number" value={settings.max_file_size_mb || "50"} onChange={(e) => update("max_file_size_mb", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Max uploads per user</label>
              <input type="number" value={settings.max_uploads_per_user || "20"} onChange={(e) => update("max_uploads_per_user", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={save} disabled={saving} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saved && <span className="text-green-600 text-sm">Settings saved!</span>}
        </div>
      </div>
    </div>
  );
}
