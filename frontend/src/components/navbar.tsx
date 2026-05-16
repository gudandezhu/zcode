"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/kanban", label: "看板" },
  { href: "/chat", label: "聊天" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-white">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-8">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Zcode
        </Link>
        <div className="flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
