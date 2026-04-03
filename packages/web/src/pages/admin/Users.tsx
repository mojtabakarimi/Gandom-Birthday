import { useState, useEffect } from "react";
import { api } from "../../api";

export function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  const loadUsers = () => {
    api.admin.users().then((d) => setUsers(d.users)).catch(() => {});
  };

  useEffect(() => { loadUsers(); }, []);

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await api.admin.createInvite({ display_name: newName });
    setInviteLink(`${window.location.origin}/invite/${data.invite_token}`);
    setNewName("");
    loadUsers();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user and all their uploads?")) return;
    await api.admin.deleteUser(id, true);
    loadUsers();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Users</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
        >
          Create Invite
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <form onSubmit={createInvite} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Display name (e.g. Uncle Ali)"
              required
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">
              Generate Link
            </button>
          </form>
          {inviteLink && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-3">
              <input type="text" value={inviteLink} readOnly className="flex-1 text-sm bg-transparent" />
              <button
                onClick={() => navigator.clipboard.writeText(inviteLink)}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {users.map((u) => (
          <div key={u.id} className="p-4 flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-700">{u.display_name}</span>
              {u.username && <span className="text-gray-500 text-sm ml-2">@{u.username}</span>}
              <span className="text-gray-400 text-xs ml-2">
                {u.invite_accepted ? "Active" : "Invite pending"} · {u.upload_count} uploads
              </span>
            </div>
            <div className="flex items-center gap-2">
              {u.role === "admin" ? (
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">Admin</span>
              ) : (
                <button
                  onClick={() => deleteUser(u.id)}
                  className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
