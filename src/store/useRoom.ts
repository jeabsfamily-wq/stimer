import { create } from "zustand";
import { socket, clientId } from "../lib/socket";
import type { Socket } from "socket.io-client";

type RoomState = "WAITING" | "RUNNING" | "ENDED";

interface StationSlot {
  id: number;
  ownerClientId?: string;
  ready: boolean;
  connected: boolean;
}

interface Snapshot {
  code?: string;
  centralClientId?: string;
  state?: RoomState;
  stationsCount?: number;
  roundDurationSec?: number;
  stations?: StationSlot[];
  startedAt?: number;
  timeLeft?: number;
}

interface Store {
  clientId?: string;
  role: "central" | "station" | null;
  snapshot: Snapshot;
  timeLeft?: number;
  soundEnabled: boolean;

  setSocket: (s: Socket) => void;
  setClientId: (id: string) => void;
  setRole: (r: Store["role"]) => void;
  setSoundEnabled: (b: boolean) => void;

  actions: {
    centralCreate: (stationsCount: number, roundDurationSec: number) => Promise<void>;
    centralUpdate: (stationsCount: number, roundDurationSec: number) => Promise<void>;
    centralDelete: (force?: boolean) => Promise<void>;
    centralPause: () => Promise<void>;
    centralResume: () => Promise<void>;
    centralReset: () => Promise<void>;
    centralTogglePause: () => Promise<void>;

    /** ✅ ใหม่ */
    centralSkipRound: () => Promise<void>;
    centralRemoveStation: (stationId: number) => Promise<void>;
    stationLeave: (roomCode: string) => Promise<void>;

    stationJoin: (roomCode: string, stationId?: number) => Promise<void>;
    stationSetReady: (ready: boolean) => Promise<void>;
  };
}

export const useRoom = create<Store>((set, get) => ({
  role: null,
  snapshot: {},
  soundEnabled: false,

  setSocket: (s: Socket) => {
    const ANY = window as any;
    if (ANY.__st_listeners_bound__) return;
    ANY.__st_listeners_bound__ = true;

    // ====== Room lifecycle ======
    s.on("room:updated", (snap: Snapshot) => set({ snapshot: snap }));

    s.on("room:started", (p: { startedAt: number; roundDurationSec: number }) => {
      set((state) => ({
        snapshot: { ...state.snapshot, startedAt: p.startedAt, state: "RUNNING" },
        timeLeft: p.roundDurationSec,
      }));
      window.dispatchEvent(new CustomEvent("st:sound:start"));
    });

    s.on("room:resumed", (p: { startedAt: number; roundDurationSec: number }) => {
      set((state) => ({
        snapshot: { ...state.snapshot, startedAt: p.startedAt, state: "RUNNING" },
      }));
      // ไม่เล่นเสียงเริ่มใหม่
    });

    s.on("room:tick", ({ timeLeft }: { timeLeft: number }) => set({ timeLeft }));

    // เดิมมี warn30s อยู่แล้ว
    s.on("room:warn30s", () => window.dispatchEvent(new CustomEvent("st:sound:warn30s")));

    // ✅ ใหม่: warn60s -> ให้ SoundManager เล่นเสียง
    s.on("room:warn60s", () => {
      window.dispatchEvent(new CustomEvent("st:sound:warn60s"));
    });

    s.on("room:timeUp", () => {
      window.dispatchEvent(new CustomEvent("st:sound:timeup"));
      set({ timeLeft: undefined });
    });

    s.on("room:deleted", () => {
      localStorage.removeItem("st:lastRoomCode");
      localStorage.removeItem("st:lastStationId");
      set({ role: null, snapshot: {}, timeLeft: undefined });
    });

    // ====== Station events ======

    // ✅ ใหม่: ถูก kick ออกจากสถานี
    s.on("station:kicked", (p: { reason: string; ownerClientId: string; stationId: number; roomCode: string }) => {
      // ลบเฉพาะ key ของห้องนั้น ๆ ตามรูปแบบใหม่
      localStorage.removeItem(`st:${p.roomCode}:stationId`);
      // เผื่อโค้ดเดิมยังใช้ key เก่าอยู่ด้วย
      const lastRoom = localStorage.getItem("st:lastRoomCode");
      if (lastRoom === p.roomCode) {
        localStorage.removeItem("st:lastStationId");
      }

      // กลับไปหน้าเลือกสถานี ถ้าเป็นเจ้าของ station ที่โดน kick
      if (p.ownerClientId === clientId) {
        set((state) => ({
          role: "station",
          snapshot: { ...state.snapshot, stations: state.snapshot.stations ?? [] },
        }));
      }
    });

    // ✅ ใหม่: renumber แล้วอัปเดต localStorage
    s.on("station:renumbered", (p: { clientId: string; oldId: number; newId: number }) => {
      // ใช้ clientId จาก lib/socket
      if (p.clientId === clientId) {
        const code = get().snapshot.code;
        if (code) {
          const k = `st:${code}:stationId`;
          const saved = localStorage.getItem(k);
          if (saved && Number(saved) === p.oldId) {
            localStorage.setItem(k, String(p.newId));
          }

          // เผื่อของเดิมยังอ่าน key เก่า
          const lastRoom = localStorage.getItem("st:lastRoomCode");
          if (lastRoom === code) {
            const savedOld = localStorage.getItem("st:lastStationId");
            if (savedOld && Number(savedOld) === p.oldId) {
              localStorage.setItem("st:lastStationId", String(p.newId));
            }
          }
        }
      }
    });

    // ====== Auto re-join after connect (ของเดิม) ======
    s.on("connect", () => {
      const lastRoom = localStorage.getItem("st:lastRoomCode");
      if (lastRoom) {
        s.emit("station:join", { roomCode: lastRoom, clientId });
      }
      // ถ้าในอนาคตอยากแม่นยำขึ้น: อ่าน stationId จาก `st:<roomCode>:stationId`
      // แล้วส่งไปด้วยได้ เช่น:
      // const sid = localStorage.getItem(`st:${lastRoom}:stationId`);
      // s.emit("station:join", { roomCode: lastRoom, stationId: sid ? Number(sid) : undefined, clientId });
    });
  },

  setClientId: (id) => set({ clientId: id }),
  setRole: (r) => set({ role: r }),
  setSoundEnabled: (b) => set({ soundEnabled: b }),

  actions: {
    // ====== Central actions (เดิม) ======
    centralCreate: async (stationsCount, roundDurationSec) => {
      await new Promise<void>((resolve, reject) => {
        socket.emit("central:createRoom", { stationsCount, roundDurationSec }, (res: any) => {
          if (res?.ok) {
            set({ snapshot: res.room });
            resolve();
          } else reject(res?.error);
        });
      });
    },
    centralUpdate: async (stationsCount, roundDurationSec) => {
      const code = get().snapshot.code!;
      await new Promise<void>((resolve, reject) => {
        socket.emit("central:updateConfig", { code, stationsCount, roundDurationSec }, (res: any) =>
          res?.ok ? resolve() : reject(res?.error)
        );
      });
    },
    centralDelete: async (force?: boolean) => {
      const code = get().snapshot.code!;
      await new Promise<void>((resolve, reject) => {
        socket.emit("central:deleteRoom", { code, force }, (res: any) =>
          res?.ok ? resolve() : reject(res?.error)
        );
      });
    },
    centralPause: async () => {
      const code = get().snapshot.code!;
      await new Promise<void>((resolve, reject) => {
        socket.emit("central:pauseRound", { code }, (res: any) =>
          res?.ok ? resolve() : reject(res?.error)
        );
      });
    },
    centralResume: async () => {
      const code = get().snapshot.code!;
      await new Promise<void>((resolve, reject) => {
        socket.emit("central:resumeRound", { code }, (res: any) =>
          res?.ok ? resolve() : reject(res?.error)
        );
      });
    },
    centralReset: async () => {
      const code = get().snapshot.code!;
      await new Promise<void>((resolve, reject) => {
        socket.emit("central:resetRoom", { code }, (res: any) =>
          res?.ok ? resolve() : reject(res?.error)
        );
      });
    },
    centralTogglePause: async () => {
      const snap = get().snapshot;
      if (!snap.code) return;
      if (snap.state === "RUNNING") {
        return get().actions.centralPause();
      }
      const canResume = snap.state === "ENDED" && (snap.timeLeft ?? 0) > 0;
      if (canResume) {
        return get().actions.centralResume();
      }
    },

    // ====== Central actions (ใหม่) ======
    centralSkipRound: async () => {
      const code = get().snapshot.code!;
      await new Promise<void>((resolve, reject) => {
        socket.emit("central:skipRound", { code }, (res: any) =>
          res?.ok ? resolve() : reject(res?.error)
        );
      });
    },

    centralRemoveStation: async (stationId: number) => {
      const code = get().snapshot.code!;
      await new Promise<void>((resolve, reject) => {
        socket.emit("central:removeStation", { roomCode: code, stationId }, (res: any) =>
          res?.ok ? resolve() : reject(res?.error)
        );
      });
    },

    // ====== Station actions (เดิม + ใหม่) ======
    stationJoin: async (roomCode, stationId) => {
      await new Promise<void>((resolve, reject) => {
        socket.emit("station:join", { roomCode, stationId, clientId }, (res: any) => {
          if (res?.ok) {
            set({ snapshot: res.room });
            // เข้ากันได้ย้อนหลัง
            localStorage.setItem("st:lastRoomCode", roomCode);
            if (stationId) localStorage.setItem("st:lastStationId", String(stationId));
            // รูปแบบใหม่ ต่อห้อง
            if (res?.room?.code && res?.room?.stations) {
              const my = res.room.stations.find((st: StationSlot) => st.ownerClientId === clientId);
              if (my) {
                localStorage.setItem(`st:${res.room.code}:stationId`, String(my.id));
              } else if (stationId) {
                localStorage.setItem(`st:${res.room.code}:stationId`, String(stationId));
              }
            }
            resolve();
          } else reject(res?.error);
        });
      });
    },

    stationSetReady: async (ready) => {
      const code = get().snapshot.code!;
      await new Promise<void>((resolve, reject) => {
        socket.emit("station:setReady", { roomCode: code, ready }, (res: any) =>
          res?.ok ? resolve() : reject(res?.error)
        );
      });
    },

    // ✅ ใหม่: leave ออกจากห้อง (กดจาก StationView)
    stationLeave: async (roomCode: string) => {
      await new Promise<void>((resolve, reject) => {
        socket.emit("station:leave", { roomCode }, (res: any) =>
          res?.ok ? resolve() : reject(res?.error)
        );
      });

      // ลบ key เฉพาะห้องนี้
      localStorage.removeItem(`st:${roomCode}:stationId`);
      // เผื่อโค้ดเดิมยังอ้างอิง key เก่า
      const lastRoom = localStorage.getItem("st:lastRoomCode");
      if (lastRoom === roomCode) {
        localStorage.removeItem("st:lastStationId");
      }

      // การนำทางกลับไปหน้าเลือกสถานี ให้ทำตามเงื่อนไขที่หน้าจอคุณใช้อยู่
      // (เช่น เช็คว่าไม่มี key st:<roomCode>:stationId แล้ว render หน้าเลือก)
    },
  },
}));
