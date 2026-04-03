import { useState, useEffect } from "react";
import { api } from "../../api";

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    api.admin.stats().then(setStats).catch(() => {});
    api.admin.uploads().then((d) => setRecent(d.uploads.slice(0, 10))).catch(() => {});
  }, []);

  if (!stats) return <p>Loading...</p>;

  const statCards = [
    { label: "Total Users", value: stats.total_users, color: "bg-blue-100 text-blue-700" },
    { label: "Pending", value: stats.pending_uploads, color: "bg-yellow-100 text-yellow-700" },
    { label: "Approved", value: stats.approved_uploads, color: "bg-green-100 text-green-700" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className={`rounded-xl p-6 ${s.color}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Uploads</h3>
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {recent.length === 0 ? (
          <p className="p-4 text-gray-500">No uploads yet.</p>
        ) : (
          recent.map((u) => (
            <div key={u.id} className="p-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">{u.display_name}</span>
                {u.caption && <span className="text-sm text-gray-500 ml-2">— {u.caption}</span>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                u.status === "approved" ? "bg-green-100 text-green-700"
                  : u.status === "rejected" ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}>{u.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
