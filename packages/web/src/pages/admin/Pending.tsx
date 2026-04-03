import { useState, useEffect } from "react";
import { api } from "../../api";

export function Pending() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = () => {
    api.admin.uploads({ status: "pending" }).then((d) => setUploads(d.uploads)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const approve = async (id: string) => { await api.admin.updateUpload(id, "approved"); load(); };
  const reject = async (id: string) => { await api.admin.updateUpload(id, "rejected"); load(); };

  const bulkAction = async (action: string) => {
    if (selected.size === 0) return;
    await api.admin.bulkAction([...selected], action);
    setSelected(new Set());
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Pending Approvals ({uploads.length})</h2>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <button onClick={() => bulkAction("approve")} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">
              Approve {selected.size}
            </button>
            <button onClick={() => bulkAction("reject")} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
              Reject {selected.size}
            </button>
          </div>
        )}
      </div>

      {uploads.length === 0 ? (
        <p className="text-gray-500">No pending uploads.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {uploads.map((u) => (
            <div key={u.id} className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${
              selected.has(u.id) ? "border-purple-500" : "border-transparent"
            }`}>
              <div className="aspect-square bg-gray-100 cursor-pointer" onClick={() => toggle(u.id)}>
                {u.media_type === "image" ? (
                  <img src={api.gallery.fileUrl(u.thumbnail_key || u.file_key)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video src={api.gallery.fileUrl(u.file_key)} className="w-full h-full object-cover" muted preload="metadata" />
                )}
              </div>
              <div className="p-3">
                {u.caption && <p className="text-sm text-gray-600 mb-1 truncate">{u.caption}</p>}
                <p className="text-xs text-gray-500 mb-2">{u.display_name} · {new Date(u.uploaded_at).toLocaleDateString()}</p>
                <div className="flex gap-2">
                  <button onClick={() => approve(u.id)} className="flex-1 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200">Approve</button>
                  <button onClick={() => reject(u.id)} className="flex-1 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200">Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
