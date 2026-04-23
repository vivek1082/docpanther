"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, FileText, Bell, Settings } from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/demo" },
  { icon: FolderOpen, label: "Cases", href: "/demo/cases" },
  { icon: FileText, label: "Templates", href: "/demo/templates" },
  { icon: Bell, label: "Reminders", href: "/demo/reminders" },
];

export default function DemoSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-zinc-100 fixed h-full z-20">
      <div className="p-5 border-b border-zinc-100">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">DP</span>
          </div>
          <span className="font-bold text-zinc-900">DocPanther</span>
        </Link>
        <div className="mt-1 text-xs text-zinc-400 font-medium">demo workspace</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? "bg-orange-50 text-orange-600" : "text-zinc-600 hover:bg-zinc-50"}`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-zinc-100">
        <Link href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
          <Settings size={16} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
