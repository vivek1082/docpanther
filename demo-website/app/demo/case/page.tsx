"use client";
import { useState } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Download, Send, Copy, Check, CheckCircle2,
  AlertCircle, FileText, ThumbsUp, ThumbsDown,
  ExternalLink, FolderOpen, Shield,
} from "lucide-react";
import { mockCases } from "@/lib/mockData";
import DemoSidebar from "@/components/DemoSidebar";

const statusConfig = {
  complete: { label: "Complete", color: "bg-green-100 text-green-700" },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-700" },
  pending: { label: "Pending", color: "bg-zinc-100 text-zinc-600" },
  uploaded: { label: "Uploaded", color: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
};

function CaseDetailContent() {
  const params = useSearchParams();
  const id = params.get("id") || "1";
  const caseData = mockCases.find((c) => c.id === id) || mockCases[0];

  const [itemStatuses, setItemStatuses] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    caseData.checklist.forEach((item) => { init[item.id] = item.status; });
    return init;
  });
  const [copied, setCopied] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  const pct = Math.round((caseData.uploadedItems / caseData.totalItems) * 100);
  const link = `docpanther.com/upload/${caseData.token}`;

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const approve = (id: string) => setItemStatuses((p) => ({ ...p, [id]: "approved" }));
  const reject = (id: string) => setItemStatuses((p) => ({ ...p, [id]: "rejected" }));

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <DemoSidebar />
      <div className="flex-1 md:ml-56">
      {/* Top bar */}
      <header className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/demo" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <span className="text-zinc-200">|</span>
          <div>
            <span className="font-bold text-zinc-900">{caseData.customerName}</span>
            <span className="text-zinc-400 text-sm ml-2">· {caseData.referenceNo}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setReminderSent(true); setTimeout(() => setReminderSent(false), 3000); }}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border transition-all ${reminderSent ? "border-green-300 bg-green-50 text-green-700" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}
          >
            {reminderSent ? <><Check size={14} /> Reminder Sent!</> : <><Send size={14} /> Send Reminder</>}
          </button>
          <button className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:border-zinc-300 transition-colors">
            <Download size={14} /> Download ZIP
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Case overview card */}
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="bg-orange-500 px-6 py-5 flex items-start justify-between">
            <div>
              <p className="text-orange-100 text-xs mb-0.5">Reference: {caseData.referenceNo}</p>
              <h1 className="text-white text-xl font-bold">{caseData.customerName}</h1>
              <p className="text-orange-100 text-sm mt-0.5">{caseData.customerEmail}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {caseData.tags.map((tag) => (
                  <span key={tag} className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-xs font-semibold px-3 py-1 rounded-full ${statusConfig[caseData.status as keyof typeof statusConfig]?.color || "bg-zinc-100"}`}>
                {statusConfig[caseData.status as keyof typeof statusConfig]?.label}
              </div>
              <p className="text-orange-100 text-xs mt-2">Created {caseData.createdAt}</p>
              <p className="text-white text-sm font-bold mt-1">{caseData.uploadedItems}/{caseData.totalItems} docs</p>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-zinc-100 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-sm font-bold text-zinc-900">{pct}%</span>
            </div>

            {/* Upload link */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
              <span className="text-xs text-zinc-500 font-medium">Upload Link:</span>
              <span className="text-sm text-zinc-700 flex-1 truncate font-mono">{link}</span>
              <button onClick={copy} className="text-zinc-400 hover:text-orange-500 transition-colors">
                {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
              </button>
              <Link href={`/demo/upload?token=${caseData.token}`} target="_blank" className="text-zinc-400 hover:text-orange-500 transition-colors">
                <ExternalLink size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* Storage mode info */}
        <div className="bg-white rounded-2xl border border-zinc-100 px-5 py-4 flex items-center gap-3">
          <FolderOpen size={16} className="text-orange-500 shrink-0" />
          <div>
            <span className="text-sm font-medium text-zinc-700">Storage mode: </span>
            <span className="text-sm font-bold text-zinc-900 capitalize">{caseData.storageMode}</span>
            <span className="text-sm text-zinc-400 ml-2">
              {caseData.storageMode === "flat" ? "— all files in one folder" : "— subfolder per checklist item"}
            </span>
          </div>
          <div className="ml-auto text-xs text-zinc-400 font-mono shrink-0">
            hdfc/{caseData.referenceNo}_{caseData.customerName.replace(" ", "")}/
          </div>
        </div>

        {/* Checklist detail */}
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-50 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Checklist & Documents</h2>
            <span className="text-xs text-zinc-400">{caseData.checklist.length} items</span>
          </div>

          <div className="divide-y divide-zinc-50">
            {caseData.checklist.map((item) => {
              const status = itemStatuses[item.id];
              const isDone = status === "uploaded" || status === "approved" || status === "rejected";
              const cfg = statusConfig[status as keyof typeof statusConfig];

              return (
                <div key={item.id} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isDone ? "bg-green-100" : "bg-zinc-100"}`}>
                        {isDone
                          ? <CheckCircle2 size={14} className="text-green-600" />
                          : <AlertCircle size={14} className="text-zinc-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-zinc-900 text-sm">{item.name}</p>
                          {item.required
                            ? <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">Required</span>
                            : <span className="text-xs bg-zinc-100 text-zinc-400 px-2 py-0.5 rounded-full">Optional</span>
                          }
                          {cfg && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                          )}
                        </div>

                        {/* Files */}
                        {item.files.length > 0 ? (
                          <div className="space-y-1 mt-2">
                            {item.files.map((file, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-zinc-600 bg-zinc-50 px-3 py-2 rounded-lg">
                                <FileText size={12} className="text-zinc-400 shrink-0" />
                                <span className="flex-1 truncate">{file}</span>
                                <button className="text-orange-500 hover:text-orange-600 font-medium shrink-0">View</button>
                                <button className="text-zinc-400 hover:text-zinc-600 shrink-0">
                                  <Download size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 mt-1">No files uploaded yet</p>
                        )}
                      </div>
                    </div>

                    {/* Approve / Reject */}
                    {item.files.length > 0 && status !== "approved" && status !== "rejected" && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => approve(item.id)} className="flex items-center gap-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
                          <ThumbsUp size={12} /> Approve
                        </button>
                        <button onClick={() => reject(item.id)} className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-medium transition-colors">
                          <ThumbsDown size={12} /> Reject
                        </button>
                      </div>
                    )}
                    {status === "approved" && (
                      <div className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                        <ThumbsUp size={12} /> Approved
                      </div>
                    )}
                    {status === "rejected" && (
                      <div className="flex items-center gap-1 text-xs text-red-500 font-medium shrink-0">
                        <ThumbsDown size={12} /> Rejected
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demo guide */}
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
          <p className="text-sm font-semibold text-orange-800 mb-2">Demo flow</p>
          <ol className="text-sm text-orange-700 space-y-1 list-decimal list-inside">
            <li>This is the <strong>admin view</strong> — you see the checklist and all uploaded files</li>
            <li>Click <strong>External Link icon</strong> next to the upload link above to open the customer upload portal</li>
            <li>Upload files there as a customer, then come back here to see the admin view</li>
            <li>Use <strong>Approve / Reject</strong> buttons to review each document</li>
          </ol>
        </div>

        <div className="text-center text-xs text-zinc-400 pb-4 flex items-center justify-center gap-1">
          <Shield size={12} />
          Demo mode — no real files are stored
        </div>
      </div>
      </div>
    </div>
  );
}

export default function CasePage() {
  return (
    <Suspense>
      <CaseDetailContent />
    </Suspense>
  );
}
