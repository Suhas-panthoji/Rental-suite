"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Transient welcome screen: "Welcome" + owner's name, then floats away into the dashboard. */
export function WelcomeFlash({ name }: { name: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1700);
    const t2 = setTimeout(() => router.replace("/dashboard"), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [router]);

  return (
    <div
      onClick={() => router.replace("/dashboard")}
      className={`flex min-h-screen flex-col items-center justify-center bg-slate-50 ${
        leaving ? "rs-fade-out" : ""
      }`}
    >
      <div className={leaving ? "rs-float-away" : ""}>
        <div className="rs-rise-in flex flex-col items-center px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">Welcome</h1>
          <p className="mt-4 text-2xl font-semibold text-blue-600 sm:text-3xl">{name}</p>
          <p className="mt-6 text-sm text-slate-500">Taking you to your dashboard…</p>
        </div>
      </div>
    </div>
  );
}
