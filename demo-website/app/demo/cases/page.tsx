"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Download, Send, Eye, MoreHorizontal, CheckCircle2, Clock, AlertCircle, ChevronDown } from "lucide-react";
import DemoSidebar from "@/components/DemoSidebar";
import { mockCases } from "@/lib/mockData";

const statusConfig = {
  complete: { label: "Complete", color: "bg-green-100 text-green-700" },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-700" },
  pending: { label: "Pending", color: "bg-zinc-100 text-zinc-600" },
};

export default function CasesPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = mockCases.filter((c) => {
    const matchStatus = filter === "all" || c.status === filter;
    const matchSearch = c.customerName.toLowerCase().includes(search.toLowerCase()) || c.referenceNo.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <DemoSidebar />
      <main className="flex-1 md:ml-56">
        <header className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="font-bold text-zinc-900">Cases</h1>
            <p className="text-xs text-zinc-400">All document collection cases</p>
          </div>
          <Link href="/demo" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            <Plus size={16} /> New Case
          </Link>
        </header>

        <div className="p-6">
          <div className="bg-white rounded-2xl border border-zinc-100">
            <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 w-full">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cases..." className="pl-8 pr-3 py-2 border border-zinc-200 rounded-xl text-sm w-full focus:outline-none focus:border-orange-400" />
                </div>
                <div className="relative">
                  <select value={filter} onChange={(e) => setFilter(e.target.value)} className="appearance-none border border-zinc-200 rounded-xl px-3 py-2 text-sm pr-7 focus:outline-none focus:border-orange-400 bg-white text-zinc-700">
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="complete">Complete</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="divide-y divide-zinc-50">
              {filtered.map((c) => {
                const cfg = statusConfig[c.status as keyof typeof statusConfig];
                const pct = Math.round((c.uploadedItems / c.totalItems) * 100);
                return (
                  <div key={c.id} className="p-5 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-zinc-900">{c.customerName}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                          {c.tags.map((tag) => (
                            <span key={tag} className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                        <p className="text-sm text-zinc-500 mb-3">Ref: {c.referenceNo} · Created {c.createdAt}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-zinc-100 rounded-full h-1.5 max-w-xs">
                            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-zinc-500">{c.uploadedItems}/{c.totalItems} docs</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/demo/case?id=${c.id}`} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors" title="View case">
                          <Eye size={16} />
                        </Link>
                        <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors" title="Share link">
                          <Send size={16} />
                        </button>
                        <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors" title="Download ZIP">
                          <Download size={16} />
                        </button>
                        <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="py-16 text-center text-zinc-400">
                <p className="font-medium">No cases found</p>
                <p className="text-sm mt-1">Try changing your filters</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
