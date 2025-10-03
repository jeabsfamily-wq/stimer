// frontend/src/components/SoundManager.tsx
import React, { useEffect, useRef } from "react";

type Props = { enabled?: boolean };

/** ฟัง CustomEvent แล้วเล่นเสียงจาก /public/sounds */
export default function SoundManager({ enabled = true }: Props) {
  const startRef = useRef<HTMLAudioElement | null>(null);
  const warn60Ref = useRef<HTMLAudioElement | null>(null);
  const warn30Ref = useRef<HTMLAudioElement | null>(null);
  const timeupRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // preload
    startRef.current = new Audio("/sounds/start.mp3");
    warn60Ref.current = new Audio("/sounds/warn60s.mp3");
    warn30Ref.current = new Audio("/sounds/warn30s.mp3");
    timeupRef.current = new Audio("/sounds/timeup.mp3");

    [startRef, warn60Ref, warn30Ref, timeupRef].forEach((r) => {
      if (r.current) {
        r.current.preload = "auto";
        r.current.crossOrigin = "anonymous";
        r.current.volume = 1.0;
      }
    });

    // unlock audio on first user gesture (กัน autoplay policy)
    const unlock = () => {
      [startRef, warn60Ref, warn30Ref, timeupRef].forEach((r) => {
        if (r.current) {
          r.current.muted = false;
        }
      });
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("click", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);

    const playSafe = (ref: React.MutableRefObject<HTMLAudioElement | null>) => {
      if (!enabled || !ref.current) return;
      try {
        ref.current.currentTime = 0;
        void ref.current.play();
      } catch {}
    };

    const onStart = () => playSafe(startRef);
    const onWarn60 = () => playSafe(warn60Ref);
    const onWarn30 = () => playSafe(warn30Ref);
    const onTimeUp = () => playSafe(timeupRef);

    window.addEventListener("st:sound:start", onStart);
    window.addEventListener("st:sound:warn60s", onWarn60);
    window.addEventListener("st:sound:warn30s", onWarn30);
    window.addEventListener("st:sound:timeup", onTimeUp);

    return () => {
      window.removeEventListener("st:sound:start", onStart);
      window.removeEventListener("st:sound:warn60s", onWarn60);
      window.removeEventListener("st:sound:warn30s", onWarn30);
      window.removeEventListener("st:sound:timeup", onTimeUp);

      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, [enabled]);

  return null; // ตัวจัดการเสียง ไม่ต้องมี UI
}
