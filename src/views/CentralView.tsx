import React, { useState } from "react";
import { useRoom } from "../store/useRoom";
import { Timer } from "../components/Timer";

export default function CentralView() {
  const { snapshot, timeLeft, actions, clientId } = useRoom();
  const hasRoom = Boolean(snapshot.code);

  const [stationsCount, setStations] = useState(snapshot.stationsCount ?? 5);
  const [dur, setDur] = useState(snapshot.roundDurationSec ?? 300);

  const isWaiting = snapshot.state === "WAITING";
  const isRunning = snapshot.state === "RUNNING";
  const isEnded = snapshot.state === "ENDED";
  const canResume = isEnded && (snapshot.timeLeft ?? 0) > 0;

  const isCentral = snapshot.centralClientId === clientId;
  const updatable = hasRoom && isWaiting && isCentral;

  async function handleCreate() { try { await actions.centralCreate(stationsCount, dur); } catch (e:any){ alert(e?.code ?? "Create failed"); } }
  async function handleUpdate() { try { await actions.centralUpdate(stationsCount, dur); } catch (e:any){ alert(e?.code ?? "Update failed"); } }
  async function handleDelete(force?: boolean) { try { await actions.centralDelete(force); } catch (e:any){ alert(e?.code ?? "Delete failed"); } }
  async function handleTogglePause() { try { await actions.centralTogglePause(); } catch (e:any){ alert(e?.code ?? "Pause/Resume failed"); } }
  async function handleReset() { try { await actions.centralReset(); } catch (e:any){ alert(e?.code ?? "Reset failed"); } }
  async function handleSkipRound() { try { await actions.centralSkipRound(); } catch (e:any){ alert(e?.code ?? "Skip failed"); } }
  async function handleRemoveStation(id: number) { try { await actions.centralRemoveStation(id); } catch (e:any){ alert(e?.code ?? "Remove failed"); } }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          Central — {hasRoom ? `Room ${snapshot.code}` : "No room yet"}
        </h2>
        {hasRoom ? (
          <button
            onClick={() => handleDelete(isRunning && isCentral ? true : undefined)}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50"
            disabled={!isCentral}
            title={!isCentral ? "Only the room creator (Central) can delete this room" : undefined}
          >
            Delete Room{isRunning ? " (force)" : ""}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm">Stations</label>
          <input type="number" min={1} value={stationsCount}
            onChange={(e)=>setStations(Number(e.target.value))}
            disabled={!isCentral || !isWaiting}
            title={!isCentral ? "Only Central can change" : !isWaiting ? "Change only in WAITING" : undefined}/>
        </div>
        <div>
          <label className="block text-sm">Duration (sec)</label>
          <input type="number" min={10} value={dur}
            onChange={(e)=>setDur(Number(e.target.value))}
            disabled={!isCentral || !isWaiting}
            title={!isCentral ? "Only Central can change" : !isWaiting ? "Change only in WAITING" : undefined}/>
        </div>

        {!hasRoom ? (
          <button onClick={handleCreate}>Create Room</button>
        ) : (
          <button disabled={!updatable} onClick={handleUpdate}>Update Config</button>
        )}

        {hasRoom && (
          <button
            onClick={handleTogglePause}
            disabled={!isCentral || !(isRunning || canResume)}
            title={!isCentral ? "Only Central can control" : undefined}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
          >
            {isRunning ? "Pause" : canResume ? "Resume" : "Pause"}
          </button>
        )}

        {hasRoom && (
          <button
            onClick={handleReset}
            disabled={!isCentral}
            title={!isCentral ? "Only Central can control" : undefined}
            className="bg-slate-600 hover:bg-slate-500 disabled:opacity-50"
          >
            Reset
          </button>
        )}

        {/* ✅ Skip Round */}
        {hasRoom && (
          <button
            onClick={handleSkipRound}
            disabled={!isCentral || !isRunning}
            title="End this round immediately"
            className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50"
          >
            Skip Round
          </button>
        )}

        <div className="ml-auto">
          <Timer timeLeft={timeLeft ?? snapshot.timeLeft} />
          <div className="text-sm opacity-70">State: {snapshot.state ?? "-"}</div>
        </div>
      </div>

      {hasRoom && (
        <>
          <table className="w-full text-sm">
            <thead className="opacity-70">
              <tr>
                <th className="text-left">Station</th>
                <th>Owner</th>
                <th>Ready</th>
                <th>Conn</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.stations?.map((s) => (
                <tr key={s.id} className="border-t border-slate-700">
                  <td className="py-1 text-left">#{s.id}</td>
                  <td className="text-center truncate max-w-[160px]">{s.ownerClientId?.slice(0,8) ?? "-"}</td>
                  <td className="text-center">{s.ready ? "✅" : "⬜"}</td>
                  <td className="text-center">{s.connected ? "🟢" : "⚫"}</td>
                  <td className="text-center">
                    <button
                      className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-2"
                      disabled={!isCentral}
                      title={isRunning ? "Kick now; compact after round" : "Remove & renumber now"}
                      onClick={() => handleRemoveStation(s.id)}
                    >
                      {isRunning ? "Kick" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-xs opacity-60 space-y-1">
            <div>• Config แก้ได้เฉพาะตอน WAITING • เริ่มรอบอัตโนมัติเมื่อทุกสถานีพร้อม</div>
            <div>• คุณคือ: <span className="font-mono">{(clientId ?? "").slice(0,8) || "-"}</span> / Central Owner: <span className="font-mono">{(snapshot.centralClientId ?? "").slice(0,8) || "-"}</span></div>
            {!isCentral && (<div className="text-amber-300">* คุณไม่ใช่ Central ของห้องนี้ — ปุ่มถูกปิดไว้</div>)}
          </div>
        </>
      )}
    </div>
  );
}
