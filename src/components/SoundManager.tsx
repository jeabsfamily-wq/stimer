import React, { useEffect, useRef, useState } from 'react';

export default function SoundManager({ enabled }: { enabled: boolean }) {
  const startRef = useRef<HTMLAudioElement | null>(null);
  const warnRef = useRef<HTMLAudioElement | null>(null);
  const upRef = useRef<HTMLAudioElement | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const onStart = () => enabled && startRef.current?.play().catch(()=>visual('Start'));
    const onWarn = () => enabled && warnRef.current?.play().catch(()=>visual('30s left'));
    const onUp = () => enabled && upRef.current?.play().catch(()=>visual('Time up'));
    window.addEventListener('st:sound:start' as any, onStart);
    window.addEventListener('st:sound:warn30s' as any, onWarn);
    window.addEventListener('st:sound:timeup' as any, onUp);
    return () => {
      window.removeEventListener('st:sound:start' as any, onStart);
      window.removeEventListener('st:sound:warn30s' as any, onWarn);
      window.removeEventListener('st:sound:timeup' as any, onUp);
    };
  }, [enabled]);

  const visual = (txt: string) => {
    const el = document.createElement('div');
    el.textContent = `🔔 ${txt}`;
    el.className = 'fixed top-4 right-4 bg-yellow-300 text-black px-3 py-2 rounded shadow';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 1500);
  };

  // try preload
  useEffect(() => {
    Promise.all([
      startRef.current?.load(),
      warnRef.current?.load(),
      upRef.current?.load()
    ]).finally(() => setOk(true));
  }, []);

  return (
    <>
      <audio ref={startRef} src="/sounds/start.mp3" preload="auto" />
      <audio ref={warnRef} src="/sounds/warn30s.mp3" preload="auto" />
      <audio ref={upRef} src="/sounds/timeup.mp3" preload="auto" />
      <div className="text-xs opacity-60">{enabled ? (ok ? '🔊 Sound ready' : '🔊 Preloading...') : '🔇 Sound disabled'}</div>
    </>
  );
}
