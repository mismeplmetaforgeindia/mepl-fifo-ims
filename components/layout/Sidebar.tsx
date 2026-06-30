"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  History,
  Database,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";

type Item = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };

const OVERVIEW: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fifo-board", label: "FIFO Board", icon: Boxes },
];

const OPERATIONS: Item[] = [
  { href: "/grn-entries", label: "GRN Entries", icon: ClipboardList },
  { href: "/issue-history", label: "Issue History", icon: History },
  { href: "/master-data", label: "Master Data", icon: Database, adminOnly: true },
  { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];

function NavLink({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-metaforge-amber text-metaforge-navy"
          : "text-slate-300 hover:bg-metaforge-navy2 hover:text-white"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {item.label}
    </Link>
  );
}

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const ops = OPERATIONS.filter((i) => !i.adminOnly || isAdmin);

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
          <span className="text-[9px] font-bold tracking-tight text-metaforge-navy">MEHTA</span>
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-white">METAFORGE</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-metaforge-amber">
            Raw Material Inventory
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 px-3 py-2">
        <div>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Overview
          </p>
          <div className="space-y-1">
            {OVERVIEW.map((i) => (
              <NavLink key={i.href} item={i} active={isActive(i.href)} />
            ))}
          </div>
        </div>
        <div>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Operations
          </p>
          <div className="space-y-1">
            {ops.map((i) => (
              <NavLink key={i.href} item={i} active={isActive(i.href)} />
            ))}
          </div>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile top trigger */}
      <button
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 rounded-md bg-metaforge-navy p-2 text-white md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-metaforge-navy md:block">{content}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-metaforge-navy">
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 text-slate-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
