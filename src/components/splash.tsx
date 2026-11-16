"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Entry screen: logo + name rise in, then float away, then navigate to destination. */
export function Splash({ destination }: { destination: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1800);
    const t2 = setTimeout(() => router.replace(destination), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [destination, router]);

  return (
    <div
      onClick={() => router.replace(destination)}
      className={`flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 ${
        leaving ? "rs-fade-out" : ""
      }`}
    >
      <div className={leaving ? "rs-float-away" : ""}>
        <div className="rs-rise-in flex flex-col items-center">
          <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 text-6xl shadow-2xl backdrop-blur">
            🏠
          </div>
          <h1 className="rs-delay-1 text-center text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Rental Suite
          </h1>
          <p className="rs-delay-2 mt-3 text-sm text-slate-400 sm:text-base">
            Rents · Leases · Tenants · Bills — all in one place
          </p>
        </div>
      </div>
      <p className="mt-12 text-xs text-slate-600">Click anywhere to skip</p>
    </div>
  );
}
