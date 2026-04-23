"use client";
import { useState } from "react";
import Link from "next/link";
import { Send, Check, Bell, AlertCircle, Clock } from "lucide-react";
import DemoSidebar from "@/components/DemoSidebar";
import { mockCases } from "@/lib/mockData";

export default function RemindersPage() {
  const pendingCases = mockCases.filter((c) => c.status !== "complete");
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [sentAll, setSentAll] = useState(false);

  const sendReminder = (id: string) => {
    setSent((p) => ({ ...p, [id]: true }));
  };

  const sendAllReminders = () => {
    const allSent: Record<string, boolean> = {};
    pendingCases.forEach((c) => { allSent[c.id] = true; });
    setSent(allSent);
    setSentAll(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <DemoSidebar />
      <main className="flex-1 md:ml-56">
        <header className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="font-bold text-zinc-900">Reminders</h1>
            <p className="text-xs text-zinc-400">{pendingCases.length} cases with pending documents</p>
          </div>
          <button
            onClick={sendAllReminders}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${sentAll ? "bg-green-50 text-green-700 border border-green-200" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
          >
            {sentAll ? <><Check size={16} /> All Sent!</> : <><Send size={16} /> Send All Reminders</>}
          </button>
        </header>

        <div className="p-6 space-y-4">

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-zinc-100 p-5 text-center">
              <p className="text-3xl font-black text-zinc-600">{mockCases.filter(c => c.status === "pending").length}</p>
              <p className="text-sm text-zinc-500 mt-1">Not started</p>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 p-5 text-center">
              <p className="text-3xl font-black text-amber-600">{mockCases.filter(c => c.status === "partial").length}</p>
              <p className="text-sm text-zinc-500 mt-1">Partially done</p>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 p-5 text-center">
              <p className="text-3xl font-black text-green-600">{mockCases.filter(c => c.status === "complete").length}</p>
              <p className="text-sm text-zinc-500 mt-1">Complete</p>
            </div>
          </div>

          {/* Pending cases */}
          <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-50">
              <h2 className="font-semibold text-zinc-900">Awaiting Documents</h2>
            </div>

            <div className="divide-y divide-zinc-50">
              {pendingCases.map((c) => {
                const missing = c.totalItems - c.uploadedItems;
                const isSent = sent[c.id];

                return (
                  <div key={c.id} className="px-5 py-4 flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.status === "pending" ? "bg-zinc-100" : "bg-amber-100"}`}>
                      {c.status === "pending"
                        ? <AlertCircle size={16} className="text-zinc-500" />
                        : <Clock size={16} className="text-amber-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-zinc-900 text-sm">{c.customerName}</p>
                        <span className="text-xs text-zinc-400">{c.referenceNo}</span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {missing} document{missing !== 1 ? "s" : ""} missing · {c.customerEmail}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {c.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-zinc-100 text-zinc-400 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/demo/case?id=${c.id}`} className="text-xs text-zinc-500 hover:text-zinc-700 underline">
                        View
                      </Link>
                      <button
                        onClick={() => sendReminder(c.id)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${isSent ? "bg-green-50 text-green-700" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                      >
                        {isSent ? <><Check size={12} /> Sent!</> : <><Send size={12} /> Remind</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {pendingCases.length === 0 && (
            <div className="bg-white rounded-2xl border border-zinc-100 py-16 text-center">
              <Bell size={32} className="text-zinc-200 mx-auto mb-3" />
              <p className="font-medium text-zinc-500">All caught up!</p>
              <p className="text-sm text-zinc-400 mt-1">No pending document requests</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
