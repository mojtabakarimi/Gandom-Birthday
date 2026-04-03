import { useState, useEffect } from "react";
import { api } from "../../api";

export function Content() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = () => {
    const params = filter ? { status: filter } : undefined;
    api.admin.uploads(params).then((d) => setUploads(d.uploads)).catch(() => {});
  };

  useEffect(() => { load(); }, [filter]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const deleteUpload = async (id: string) => {
    if (!confirm("Permanently delete this upload?")) return;
    await api.admin.deleteUpload(id);
    load();
  };

  const revokeApproval = async (id: string) => { await api.admin.updateUpload(id, "rejected"); load(); };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} uploads permanently?`)) return;
    await api.admin.bulkAction([...selected], "delete");
    setSelected(new Set());
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">All Content</h2>
        <div className="flex items-center gap-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">All statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          {selected.size > 0 && (
            <button onClick={bulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Delete {selected.size}</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {uploads.map((u) => (
          <div key={u.id} className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${
            selected.has(u.id) ? "border-red-500" : "border-transparent"
          }`}>
            <div className="aspect-square bg-gray-100 cursor-pointer relative" onClick={() => toggle(u.id)}>
              {u.media_type === "image" ? (
                <img src={api.gallery.fileUrl(u.thumbnail_key || u.file_key)} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={api.gallery.fileUrl(u.file_key)} className="w-full h-full object-cover" muted preload="metadata" />
              )}
              <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full ${
                u.status === "approved" ? "bg-green-500 text-white"
                  : u.status === "rejected" ? "bg-red-500 text-white"
                  : "bg-yellow-500 text-white"
              }`}>{u.status}</span>
            </div>
            <div className="p-3">
              <p className="text-xs text-gray-500 mb-2">{u.display_name} · {new Date(u.uploaded_at).toLocaleDateString()}</p>
              <div className="flex gap-1">
                {u.status === "approved" && (
                  <button onClick={() => revokeApproval(u.id)} className="flex-1 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Revoke</button>
                )}
                <button onClick={() => deleteUpload(u.id)} className="flex-1 py-1 bg-red-100 text-red-700 rounded text-xs">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
