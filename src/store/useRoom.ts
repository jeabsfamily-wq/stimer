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
    s.on("room:warn30s", () => window.dispatchEvent(new CustomEvent("st:sound:warn30s")));
    s.on("room:timeUp", () => {
      window.dispatchEvent(new CustomEvent("st:sound:timeup"));
      set({ timeLeft: undefined });
    });
    s.on("room:deleted", () => {
      localStorage.removeItem("st:lastRoomCode");
      localStorage.removeItem("st:lastStationId");
      set({ role: null, snapshot: {}, timeLeft: undefined });
    });

    // auto-rejoin after connect
    s.on("connect", () => {
      const lastRoom = localStorage.getItem("st:lastRoomCode");
      if (lastRoom) {
        s.emit("station:join", { roomCode: lastRoom, clientId });
      }
    });
  },

  setClientId: (id) => set({ clientId: id }),
  setRole: (r) => set({ role: r }),
  setSoundEnabled: (b) => set({ soundEnabled: b }),

  actions: {
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
      const canResume = (snap.state === "ENDED") && (snap.timeLeft ?? 0) > 0;
      if (canResume) {
        return get().actions.centralResume();
      }
    },
    stationJoin: async (roomCode, stationId) => {
      await new Promise<void>((resolve, reject) => {
        socket.emit("station:join", { roomCode, stationId, clientId }, (res: any) => {
          if (res?.ok) {
            set({ snapshot: res.room });
            localStorage.setItem("st:lastRoomCode", roomCode);
            if (stationId) localStorage.setItem("st:lastStationId", String(stationId));
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
  },
}));
