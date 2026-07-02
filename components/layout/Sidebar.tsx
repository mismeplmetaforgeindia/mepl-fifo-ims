"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, Boxes, Sigma, ClipboardList, History, PackageSearch,
  Warehouse, TimerReset, Database, ShieldCheck, Menu, X, LogOut,
} from "lucide-react";

type Item = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  { title: "Overview", items: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/fifo-board", label: "FIFO Board", icon: Boxes },
    { href: "/fifo-net", label: "FIFO (Net)", icon: Sigma },
  ]},
  { title: "Operations", items: [
    { href: "/grn-entries", label: "GRN Entries", icon: ClipboardList },
    { href: "/issue-history", label: "Issue History", icon: History },
    { href: "/unracked", label: "Unracked Coils", icon: PackageSearch },
    { href: "/racked", label: "Rack Occupancy", icon: Warehouse },
    { href: "/aging", label: "Aging Report", icon: TimerReset },
  ]},
  { title: "Admin", items: [
    { href: "/master-data", label: "Master Data", icon: Database, adminOnly: true },
    { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
  ]},
];

function NavLink({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}>
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-orange-500" : "text-slate-400")} />
      {item.label}
    </Link>
  );
}

export function Sidebar({ isAdmin, email }: { isAdmin: boolean; email?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Image src="/mehta-logo.png" alt="MEHTA" width={38} height={38} className="rounded" />
        <div>
          <p className="text-sm font-extrabold leading-tight tracking-tight text-slate-900">METAFORGE</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Raw Material Inventory</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-auto px-3 py-2">
        {SECTIONS.map((sec) => {
          const items = sec.items.filter((i) => !i.adminOnly || isAdmin);
          if (!items.length) return null;
          return (
            <div key={sec.title}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{sec.title}</p>
              <div className="space-y-0.5">
                {items.map((i) => <NavLink key={i.href} item={i} active={isActive(i.href)} />)}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
            {(email ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-700">{email ?? "User"}</p>
            <p className="text-[10px] text-slate-400">{isAdmin ? "Admin" : "Viewer"}</p>
          </div>
        </div>
        <button onClick={signOut}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
        <p className="mt-2 text-center text-[10px] text-slate-400">Metaforge Engineering</p>
      </div>
    </div>
  );

  return (
    <>
      <button aria-label="Open menu" onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 rounded-md border bg-white p-2 text-slate-700 shadow-sm md:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <aside className="hidden w-64 shrink-0 border-r bg-white md:block">{content}</aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white">
            <button aria-label="Close" onClick={() => setOpen(false)} className="absolute right-3 top-3 text-slate-500"><X className="h-5 w-5" /></button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
