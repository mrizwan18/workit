"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Check-in" },
  { href: "/checklist", label: "Checklist" },
  { href: "/history", label: "History" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-700/50 bg-surface/95 backdrop-blur safe-area-pb">
      <div className="flex justify-around py-2">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded px-4 py-2 text-sm font-medium transition ${
              path === href ? "bg-accent/20 text-accent" : "text-slate-400 hover:text-white"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
