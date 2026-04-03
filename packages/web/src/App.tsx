import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "./i18n/I18nContext";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AdminRoute } from "./auth/AdminRoute";
import { Login } from "./pages/Login";
import { Setup } from "./pages/Setup";
import { Invite } from "./pages/Invite";
import { Home } from "./pages/Home";

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-center text-gray-500">{name} — coming soon</div>;
}

export function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/invite/:token" element={<Invite />} />
            <Route
              path="/gallery"
              element={
                <ProtectedRoute>
                  <Placeholder name="Gallery" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <Placeholder name="Upload" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <AdminRoute>
                  <Placeholder name="Admin" />
                </AdminRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
