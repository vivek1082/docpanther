"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Plus, Search, Download, Send, Eye, MoreHorizontal,
  CheckCircle2, Clock, AlertCircle, TrendingUp,
  Copy, Check, X, ChevronDown,
} from "lucide-react";
import DemoSidebar from "@/components/DemoSidebar";
import { mockCases, mockStats, mockTemplates } from "@/lib/mockData";

const statusConfig = {
  complete: { label: "Complete", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-700", icon: Clock },
  pending: { label: "Pending", color: "bg-zinc-100 text-zinc-600", icon: AlertCircle },
};

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6">
      <p className="text-sm text-zinc-500 mb-1">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

function CreateCaseModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [storageMode, setStorageMode] = useState("structured");
  const [checklistSource, setChecklistSource] = useState("template");
  const [selectedTemplate, setSelectedTemplate] = useState("t1");
  const [extraItems, setExtraItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900">Create New Case</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X size={20} />
          </button>
        </div>

        <div className={step === 3 ? "" : "p-6 space-y-5"}>
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Reference / Account Number</label>
                <input className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400" placeholder="e.g. LN001234, HR002891" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Customer / Recipient Name</label>
                <input className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400" placeholder="e.g. Rajesh Kumar" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                <input type="email" className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400" placeholder="rajesh@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {["Home Loan", "KYC", "Priority", "HR", "Insurance", "Legal"].map((tag) => (
                    <button key={tag} className="text-xs border border-zinc-200 hover:border-orange-400 hover:text-orange-600 px-3 py-1 rounded-full transition-colors">{tag}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Storage Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  {["flat", "structured"].map((mode) => (
                    <button key={mode} onClick={() => setStorageMode(mode)} className={`border rounded-xl p-3 text-left text-xs transition-all ${storageMode === mode ? "border-orange-400 bg-orange-50" : "border-zinc-200 hover:border-zinc-300"}`}>
                      <p className="font-semibold capitalize mb-1">{mode}</p>
                      <p className="text-zinc-500">{mode === "flat" ? "All docs in one folder" : "Subfolder per checklist item"}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Checklist Source</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ id: "scratch", label: "From Scratch" }, { id: "template", label: "Use Template" }, { id: "template+", label: "Template + Add" }].map((s) => (
                    <button key={s.id} onClick={() => setChecklistSource(s.id)} className={`border rounded-xl p-2.5 text-xs font-medium transition-all ${checklistSource === s.id ? "border-orange-400 bg-orange-50 text-orange-700" : "border-zinc-200 hover:border-zinc-300 text-zinc-600"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {(checklistSource === "template" || checklistSource === "template+") && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Select Template</label>
                  <div className="space-y-2">
                    {mockTemplates.map((t) => (
                      <button key={t.id} onClick={() => setSelectedTemplate(t.id)} className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 text-sm transition-all ${selectedTemplate === t.id ? "border-orange-400 bg-orange-50" : "border-zinc-200 hover:border-zinc-300"}`}>
                        <span className="font-medium">{t.name}</span>
                        <span className="text-zinc-400 text-xs">{t.itemCount} items</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(checklistSource === "template+" || checklistSource === "scratch") && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Add Items</label>
                  <div className="flex gap-2">
                    <input
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && newItem.trim()) { setExtraItems([...extraItems, newItem.trim()]); setNewItem(""); }}}
                      className="flex-1 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                      placeholder="e.g. NOC Letter"
                    />
                    <button onClick={() => { if (newItem.trim()) { setExtraItems([...extraItems, newItem.trim()]); setNewItem(""); }}} className="bg-orange-500 text-white px-4 rounded-xl text-sm font-medium">Add</button>
                  </div>
                  {extraItems.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {extraItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-zinc-50 px-3 py-2 rounded-lg text-sm">
                          <span>{item}</span>
                          <button onClick={() => setExtraItems(extraItems.filter((_, j) => j !== i))}><X size={14} className="text-zinc-400" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {step === 3 && (
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <h3 className="font-bold text-zinc-900 mb-1">Case Created!</h3>
            <p className="text-sm text-zinc-500 mb-5">Share this link with your customer to start collecting documents.</p>
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 mb-4 text-left">
              <span className="text-sm text-zinc-700 flex-1 truncate">docpanther.com/upload/new-xyz-123</span>
              <button onClick={() => { navigator.clipboard.writeText("docpanther.com/upload/new-xyz-123"); }} className="text-zinc-400 hover:text-orange-500">
                <Copy size={15} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {["Email", "WhatsApp", "SMS"].map((ch) => (
                <button key={ch} className="border border-zinc-200 hover:border-orange-400 hover:text-orange-600 text-sm py-2 rounded-xl transition-colors font-medium">{ch}</button>
              ))}
            </div>
            <Link href="/demo/upload?token=abc123" className="block w-full text-center bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold py-2.5 rounded-xl text-sm transition-colors">
              Preview Customer Upload Portal →
            </Link>
          </div>
        )}

        <div className="p-6 border-t border-zinc-100 flex justify-between">
          {step === 1 ? (
            <button onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-700">Cancel</button>
          ) : step === 2 ? (
            <button onClick={() => setStep(1)} className="text-sm text-zinc-500 hover:text-zinc-700">← Back</button>
          ) : (
            <button onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-700">Close</button>
          )}
          {step === 1 && (
            <button onClick={() => setStep(2)} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              Next: Checklist →
            </button>
          )}
          {step === 2 && (
            <button onClick={() => setStep(3)} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              Create Case & Get Link →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LinkModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = `docpanther.com/upload/${token}`;

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-zinc-900">Share Upload Link</h3>
          <button onClick={onClose}><X size={20} className="text-zinc-400" /></button>
        </div>
        <p className="text-sm text-zinc-500 mb-4">Share this link with your customer to start collecting documents.</p>
        <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 mb-4">
          <span className="text-sm text-zinc-700 flex-1 truncate">{link}</span>
          <button onClick={copy} className="text-zinc-400 hover:text-orange-500 transition-colors">
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Email", "WhatsApp", "SMS"].map((ch) => (
            <button key={ch} className="border border-zinc-200 hover:border-orange-400 hover:text-orange-600 text-sm py-2 rounded-xl transition-colors font-medium">{ch}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DemoPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = mockCases.filter((c) => {
    const matchStatus = filter === "all" || c.status === filter;
    const matchSearch = c.customerName.toLowerCase().includes(search.toLowerCase()) || c.referenceNo.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {showCreate && <CreateCaseModal onClose={() => setShowCreate(false)} />}
      {shareToken && <LinkModal token={shareToken} onClose={() => setShareToken(null)} />}

      <DemoSidebar />

      {/* Main */}
      <main className="flex-1 md:ml-56">
        {/* Header */}
        <header className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="font-bold text-zinc-900">Dashboard</h1>
            <p className="text-xs text-zinc-400">Demo Workspace</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            <Plus size={16} />
            New Case
          </button>
        </header>

        <div className="p-6 space-y-6">
          {/* Demo guide */}
          <div className="bg-zinc-900 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div>
              <p className="text-white font-semibold text-sm mb-1">Try the full demo flow</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">1</span>
                <span>Click <strong className="text-zinc-200">New Case</strong> to create</span>
                <span>→</span>
                <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">2</span>
                <span>Click <strong className="text-zinc-200">eye icon</strong> to see admin view</span>
                <span>→</span>
                <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">3</span>
                <span>Click the <strong className="text-zinc-200">↗ link</strong> to open customer upload portal</span>
              </div>
            </div>
            <Link href="/demo/case?id=1" className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
              See Case Detail →
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Cases" value={mockStats.total} color="text-zinc-900" />
            <StatCard label="Pending" value={mockStats.pending} sub="awaiting uploads" color="text-zinc-600" />
            <StatCard label="Partial" value={mockStats.partial} sub="in progress" color="text-amber-600" />
            <StatCard label="Complete" value={mockStats.complete} sub="ready to download" color="text-green-600" />
          </div>

          {/* Banner */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-white font-bold">143 documents collected this month</p>
              <p className="text-orange-100 text-sm">↑ 23% from last month</p>
            </div>
            <TrendingUp size={32} className="text-white/60" />
          </div>

          {/* Cases */}
          <div className="bg-white rounded-2xl border border-zinc-100">
            <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="font-semibold text-zinc-900">Cases</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-2 border border-zinc-200 rounded-xl text-sm w-full sm:w-48 focus:outline-none focus:border-orange-400" />
                </div>
                <div className="relative">
                  <select value={filter} onChange={(e) => setFilter(e.target.value)} className="appearance-none border border-zinc-200 rounded-xl px-3 py-2 text-sm pr-7 focus:outline-none focus:border-orange-400 bg-white text-zinc-700">
                    <option value="all">All</option>
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
                            <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-zinc-500 whitespace-nowrap">{c.uploadedItems}/{c.totalItems} docs</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/demo/case?id=${c.id}`} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors" title="View case detail">
                          <Eye size={16} />
                        </Link>
                        <button onClick={() => setShareToken(c.token)} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors" title="Share link">
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
          </div>

          <div className="text-center pb-4">
            <p className="text-xs text-zinc-400">This is a demo with sample data. <Link href="/" className="text-orange-500 hover:underline">Back to homepage →</Link></p>
          </div>
        </div>
      </main>
    </div>
  );
}
