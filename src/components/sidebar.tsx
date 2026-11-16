"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/properties", label: "Properties", icon: "🏢" },
  { href: "/tenants", label: "Tenants", icon: "👥" },
  { href: "/agreements", label: "Agreements", icon: "📄" },
  { href: "/dues", label: "Dues", icon: "⏰" },
  { href: "/payments", label: "Payments", icon: "💵" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 p-4 text-slate-300 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 pt-2">
          <span className="text-2xl">🏠</span>
          <div>
            <div className="text-sm font-bold text-white">Rental Suite</div>
            <div className="text-xs text-slate-500">Rent &amp; Lease Manager</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-800 pt-3">
          <div className="mb-2 flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-xs font-medium text-slate-300">{userName}</span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800/60 hover:text-white"
            >
              ⎋ Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar + scrollable nav */}
      <div className="sticky top-0 z-10 bg-slate-900 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <span>🏠</span> Rental Suite
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-xs text-slate-400">
              Sign out
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                isActive(item.href) ? "bg-white text-slate-900" : "bg-slate-800 text-slate-300"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
