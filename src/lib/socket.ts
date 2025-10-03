import { io, Socket } from "socket.io-client";

// สร้าง/ใช้ clientId เดิมเสมอ
function getOrCreateClientId(): string {
  const saved = localStorage.getItem("st:clientId");
  if (saved) return saved;

  let newId: string;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // ใช้ Web Crypto API ถ้ามี
    newId = crypto.randomUUID();
  } else {
    // fallback สำหรับ browser เก่า
    newId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  localStorage.setItem("st:clientId", newId);
  return newId;
}

export const clientId = getOrCreateClientId();

// ใช้ VITE_API_BASE_URL ถ้ามี, dev จะ fallback เป็น undefined (same-origin)
const base = import.meta.env.VITE_API_BASE_URL || undefined;

export const socket: Socket = io(base, {
  withCredentials: true,
  transports: ["websocket"],
  auth: { clientId },
});
