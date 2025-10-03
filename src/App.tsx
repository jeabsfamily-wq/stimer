// frontend/src/App.tsx
import React, { useEffect, useState } from "react";
import { useRoom } from "./store/useRoom";
import { socket, clientId as cid } from "./lib/socket";
import SoundManager from "./components/SoundManager";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") || "";

// ✅ hoist lazy imports to top-level (ลด re-create ทุก render)
const CentralView = React.lazy(() => import("./views/CentralView"));
const StationView = React.lazy(() => import("./views/StationView"));

export default function App() {
  const {
    setSocket,
    setClientId,
    role,
    setRole,
    soundEnabled,
    setSoundEnabled,
  } = useRoom();
  const [hello, setHello] = useState<{ clientId: string } | null>(null);

  // ✅ init socket + hello ping
  useEffect(() => {
    setClientId(cid);
    setSocket(socket);

    const url = API_BASE ? `${API_BASE}/api/hello` : "/api/hello";
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setHello(data))
      .catch(() => {});
  }, [setSocket, setClientId]);

  // ✅ remember last role (central/station)
  useEffect(() => {
    const lastRole = localStorage.getItem("st:lastRole") as "central" | "station" | null;
    if (lastRole) setRole(lastRole);
  }, [setRole]);

  const chooseCentral = () => {
    setRole("central");
    localStorage.setItem("st:lastRole", "central");
  };
  const chooseStation = () => {
    setRole("station");
    localStorage.setItem("st:lastRole", "station");
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-3xl font-bold">Station Timer</h1>

      <div className="flex items-center gap-4">
        <button
          onClick={chooseCentral}
          className={`px-3 py-2 rounded ${role === "central" ? "bg-indigo-700" : "bg-indigo-600"}`}
        >
          Central
        </button>
        <button
          onClick={chooseStation}
          className={`px-3 py-2 rounded ${role === "station" ? "bg-indigo-700" : "bg-indigo-600"}`}
        >
          Station
        </button>

        <label className="ml-auto text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
          />
          Enable Sound
        </label>
      </div>

      {/* ✅ เสียบตัวจัดการเสียง */}
      <SoundManager enabled={soundEnabled} />

      {/* Views */}
      {role === null && <Lobby />}

      {role === "central" && (
        <React.Suspense fallback={<div className="card">Loading Central…</div>}>
          <CentralView />
        </React.Suspense>
      )}

      {role === "station" && (
        <React.Suspense fallback={<div className="card">Loading Station…</div>}>
          <StationView />
        </React.Suspense>
      )}

      <div className="text-xs opacity-60">
        Client: {(hello?.clientId ?? cid)?.slice(0, 8) ?? "..."}
      </div>
    </div>
  );
}

function Lobby() {
  return <div className="card">เลือกโหมดที่ต้องการด้านบน (Central / Station)</div>;
}
