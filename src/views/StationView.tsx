import React, { useEffect, useState } from "react";
import { useRoom } from "../store/useRoom";
import { Timer } from "../components/Timer";

export default function StationView() {
  const { snapshot, timeLeft, actions, clientId } = useRoom();
  const [roomCode, setRoomCode] = useState("");
  const [stationId, setStationId] = useState<number>(1);
  const joined = !!snapshot.code;

  // โหลด stationId เดิมจาก localStorage ถ้ามี
  useEffect(() => {
    if (joined && snapshot.code) {
      const saved = localStorage.getItem("st:lastStationId");
      if (saved) setStationId(Number(saved));
    }
  }, [joined, snapshot.code]);

  const handleJoin = async () => {
    await actions.stationJoin(roomCode, stationId);
    // persist room & station
    localStorage.setItem("st:lastRoomCode", roomCode);
    localStorage.setItem("st:lastStationId", String(stationId));
  };

  return (
    <div className="card space-y-4">
      <h2 className="text-2xl font-semibold">Station</h2>

      {!joined ? (
        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-sm">Room Code</label>
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
            />
          </div>
          <div>
            <label className="block text-sm">Station ID</label>
            <input
              type="number"
              min={1}
              value={stationId}
              onChange={(e) => setStationId(Number(e.target.value))}
            />
          </div>
          <button onClick={handleJoin}>Join</button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div>
              Room: <span className="font-mono">{snapshot.code}</span>
            </div>
            <div>
              Your ID: <span className="font-mono">{clientId?.slice(0, 8)}</span>
            </div>
            <div className="ml-auto">
              <Timer timeLeft={timeLeft ?? snapshot.timeLeft} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => actions.stationSetReady(true)}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Ready
            </button>
            <button
              onClick={() => actions.stationSetReady(false)}
              className="bg-slate-600 hover:bg-slate-500"
            >
              Not Ready
            </button>
          </div>
        </>
      )}

      <div className="text-xs opacity-60">
        เมื่อเข้าร่วมแล้ว ระบบจะจำห้องและสถานีเดิมให้อัตโนมัติ
      </div>
    </div>
  );
}
