"use client";
import { useState } from "react";
import { Plus, FileText, Edit2, Trash2, Copy, ChevronRight } from "lucide-react";
import DemoSidebar from "@/components/DemoSidebar";

const templates = [
  {
    id: "t1", name: "Home Loan KYC", tag: "Finance",
    items: ["PAN Card", "Aadhaar Card", "Passport Photo", "Salary Slip (3 months)", "Bank Statement (6 months)", "Property Documents", "NOC Letter"],
  },
  {
    id: "t2", name: "Employee Onboarding", tag: "HR",
    items: ["Resume / CV", "Signed Offer Letter", "ID Proof", "Education Certificate", "Last Company Relieving Letter", "Bank Details"],
  },
  {
    id: "t3", name: "Insurance Claim", tag: "Insurance",
    items: ["Claim Form", "Policy Document", "ID Proof", "Hospital Bills", "Doctor Certificate", "FIR Copy (if applicable)", "Photos of Damage", "Repair Estimate"],
  },
  {
    id: "t4", name: "Property Due Diligence", tag: "Real Estate",
    items: ["Sale Agreement", "Title Deed", "Encumbrance Certificate", "NOC from Society", "Latest Tax Receipt", "Occupancy Certificate", "Floor Plan", "Link Document"],
  },
  {
    id: "t5", name: "Business Loan", tag: "Finance",
    items: ["GST Registration", "ITR (2 years)", "Balance Sheet", "P&L Statement", "Bank Statement (12 months)", "KYC of Directors", "Ownership Proof", "Business PAN", "Udyam Certificate"],
  },
];

export default function TemplatesPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <DemoSidebar />
      <main className="flex-1 md:ml-56">
        <header className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="font-bold text-zinc-900">Templates</h1>
            <p className="text-xs text-zinc-400">Reusable checklist templates</p>
          </div>
          <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            <Plus size={16} /> New Template
          </button>
        </header>

        <div className="p-6 space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{t.tag}</span>
                      <span className="text-xs text-zinc-400">{t.items.length} items</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors" title="Duplicate">
                    <Copy size={15} />
                  </button>
                  <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors" title="Edit">
                    <Edit2 size={15} />
                  </button>
                  <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={15} />
                  </button>
                  <button onClick={() => setExpanded(expanded === t.id ? null : t.id)} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors">
                    <ChevronRight size={15} className={`transition-transform ${expanded === t.id ? "rotate-90" : ""}`} />
                  </button>
                </div>
              </div>

              {expanded === t.id && (
                <div className="px-5 pb-4 border-t border-zinc-50">
                  <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {t.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-zinc-600 bg-zinc-50 px-3 py-2 rounded-lg">
                        <span className="text-xs text-zinc-400 w-4 shrink-0">{i + 1}.</span>
                        {item}
                      </div>
                    ))}
                  </div>
                  <button className="mt-3 text-xs text-orange-500 hover:text-orange-600 font-medium">
                    + Add item
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
