// frontend/src/App.tsx
import React, { useEffect, useState } from "react";
import { useRoom } from "./store/useRoom";
import { socket, clientId as cid } from "./lib/socket";
import SoundManager from "./components/SoundManager";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") || "";

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

  useEffect(() => {
    // ใช้ singleton socket + clientId ที่ persist แล้ว
    setClientId(cid);
    setSocket(socket);

    // ping backend เพื่อตั้ง cookie session (ต้องใช้ URL เต็มไปยัง backend)
    // ใน dev: Vite proxy จัดการให้ ถ้าใส่ base เป็น "" ได้ (ไม่ใส่ก็ได้)
    // ใน prod: ต้องมี VITE_API_BASE_URL เช่น https://<your-backend>.onrender.com
    const url = API_BASE ? `${API_BASE}/api/hello` : "/api/hello";
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setHello(data))
      .catch(() => {});

    // ไม่ต้อง disconnect ระหว่าง dev เพราะเราใช้ singleton
    // ถ้าต้องการ cleanup จริง ๆ (เช่นหน้า SPA ปิด) ค่อยทำ return () => socket.disconnect();
  }, [setSocket, setClientId]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-3xl font-bold">Station Timer</h1>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setRole("central")}
          className={role === "central" ? "bg-indigo-700" : "bg-indigo-600"}
        >
          Central
        </button>
        <button
          onClick={() => setRole("station")}
          className={role === "station" ? "bg-indigo-700" : "bg-indigo-600"}
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

      <SoundManager enabled={soundEnabled} />

      {role === null && <Lobby />}
      {role === "central" && <CentralLazy />}
      {role === "station" && <StationLazy />}

      <div className="text-xs opacity-60">
        Client: {(hello?.clientId ?? cid)?.slice(0, 8) ?? "..."}
      </div>
    </div>
  );
}

function Lobby() {
  return (
    <div className="card">เลือกโหมดที่ต้องการด้านบน (Central / Station)</div>
  );
}

function CentralLazy() {
  const C = React.lazy(() => import("./views/CentralView"));
  return (
    <React.Suspense fallback={<div className="card">Loading Central…</div>}>
      <C />
    </React.Suspense>
  );
}

function StationLazy() {
  const S = React.lazy(() => import("./views/StationView"));
  return (
    <React.Suspense fallback={<div className="card">Loading Station…</div>}>
      <S />
    </React.Suspense>
  );
}
