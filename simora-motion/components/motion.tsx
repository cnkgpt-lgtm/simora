'use client';

import { useEffect, useRef, useState } from 'react';

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Angka yang menghitung naik dengan halus menuju value. */
export function CountUp({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) {
      setDisplay(value);
      return;
    }
    if (reducedMotion()) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <>{display}</>;
}

/** Bungkus konten agar muncul dengan efek fade-naik berurutan (stagger). */
export function Reveal({
  delay = 0,
  className = '',
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`motion-rise ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
