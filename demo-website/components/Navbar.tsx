"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-zinc-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">DP</span>
          </div>
          <span className="font-bold text-zinc-900 text-lg">DocPanther</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-600 font-medium">
          <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-zinc-900 transition-colors">How it works</a>
          <a href="#use-cases" className="hover:text-zinc-900 transition-colors">Use cases</a>
          <a href="#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/demo" className="text-sm text-zinc-600 hover:text-zinc-900 font-medium transition-colors">
            View Demo
          </Link>
          <Link href="/demo" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Start Free →
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-zinc-100 bg-white px-4 py-4 flex flex-col gap-4 text-sm font-medium text-zinc-700">
          <a href="#features" onClick={() => setOpen(false)}>Features</a>
          <a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a>
          <a href="#use-cases" onClick={() => setOpen(false)}>Use cases</a>
          <a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>
          <Link href="/demo" className="bg-orange-500 text-white px-4 py-2 rounded-lg text-center font-semibold" onClick={() => setOpen(false)}>
            View Demo →
          </Link>
        </div>
      )}
    </nav>
  );
}
