import React from 'react';

export function Timer({ timeLeft }: { timeLeft?: number }) {
  const tl = timeLeft ?? 0;
  const m = Math.floor(tl / 60).toString().padStart(2, '0');
  const s = (tl % 60).toString().padStart(2, '0');
  return (
    <div className="text-6xl font-mono tabular-nums">
      {m}:{s}
    </div>
  );
}
