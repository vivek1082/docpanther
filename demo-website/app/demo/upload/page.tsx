"use client";
import { useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  CheckCircle2, Upload, X, FileText, AlertCircle, ChevronRight, Shield,
} from "lucide-react";
import { mockCases } from "@/lib/mockData";

type FileItem = { name: string; size: string };
type ChecklistState = Record<string, { files: FileItem[]; status: "pending" | "uploaded" }>;

function UploadPortalContent() {
  const params = useSearchParams();
  const token = params.get("token") || "abc123";

  const caseData = mockCases.find((c) => c.token === token) || mockCases[0];

  const [checklist, setChecklist] = useState<ChecklistState>(() => {
    const init: ChecklistState = {};
    caseData.checklist.forEach((item) => {
      init[item.id] = {
        files: item.files.map((f) => ({ name: f, size: "—" })),
        status: item.status as "pending" | "uploaded",
      };
    });
    return init;
  });

  const [dragOver, setDragOver] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFiles = useCallback((itemId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const item = caseData.checklist.find((c) => c.id === itemId);
    const newFiles: FileItem[] = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
    }));

    setChecklist((prev) => ({
      ...prev,
      [itemId]: {
        files: item?.allowMultiple ? [...prev[itemId].files, ...newFiles] : newFiles,
        status: "uploaded",
      },
    }));
  }, [caseData]);

  const removeFile = (itemId: string, idx: number) => {
    setChecklist((prev) => {
      const updated = prev[itemId].files.filter((_, i) => i !== idx);
      return { ...prev, [itemId]: { files: updated, status: updated.length > 0 ? "uploaded" : "pending" } };
    });
  };

  const uploadedCount = Object.values(checklist).filter((v) => v.status === "uploaded").length;
  const totalCount = caseData.checklist.length;
  const requiredCount = caseData.checklist.filter((i) => i.required).length;
  const requiredDone = caseData.checklist.filter((i) => i.required && checklist[i.id]?.status === "uploaded").length;
  const pct = Math.round((uploadedCount / totalCount) * 100);
  const canSubmit = requiredDone === requiredCount;

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-2">All done!</h2>
          <p className="text-zinc-500 mb-6">
            Your documents have been submitted successfully. The team will review them and get back to you.
          </p>
          <div className="bg-zinc-50 rounded-2xl p-4 text-sm text-zinc-600 mb-6">
            <p className="font-semibold text-zinc-900 mb-1">Submission Summary</p>
            <p>{uploadedCount} document{uploadedCount !== 1 ? "s" : ""} uploaded</p>
            <p>Reference: {caseData.referenceNo}</p>
          </div>
          <p className="text-xs text-zinc-400">You can close this window. A confirmation has been sent to {caseData.customerEmail}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">DP</span>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 text-sm">DocPanther Demo</p>
              <p className="text-xs text-zinc-400">Secure Document Upload</p>
            </div>
          </a>
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <Shield size={12} />
            Encrypted
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Case info */}
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="bg-orange-500 px-6 py-5">
            <p className="text-orange-100 text-xs font-medium mb-0.5">Reference: {caseData.referenceNo}</p>
            <p className="text-white text-xl font-bold">{caseData.customerName}</p>
            <div className="flex gap-2 mt-2">
              {caseData.tags.map((tag) => (
                <span key={tag} className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-zinc-600 font-medium">{uploadedCount} of {totalCount} documents uploaded</span>
              <span className="text-zinc-900 font-bold">{pct}%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            {!canSubmit && (
              <p className="text-xs text-zinc-400 mt-2">{requiredCount - requiredDone} required document{requiredCount - requiredDone !== 1 ? "s" : ""} remaining</p>
            )}
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-3">
          {caseData.checklist.map((item) => {
            const state = checklist[item.id];
            const isDone = state.status === "uploaded";
            const isOver = dragOver === item.id;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all ${isDone ? "border-green-200" : isOver ? "border-orange-400 bg-orange-50" : "border-zinc-100"}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(item.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); setDragOver(null); handleFiles(item.id, e.dataTransfer.files); }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isDone ? "bg-green-100" : "bg-zinc-100"}`}>
                        {isDone
                          ? <CheckCircle2 size={14} className="text-green-600" />
                          : <AlertCircle size={14} className="text-zinc-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-zinc-900 text-sm">{item.name}</p>
                          {item.required
                            ? <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">Required</span>
                            : <span className="text-xs bg-zinc-100 text-zinc-400 px-2 py-0.5 rounded-full">Optional</span>
                          }
                          {item.allowMultiple && <span className="text-xs text-zinc-400">Multiple allowed</span>}
                        </div>

                        {/* Uploaded files */}
                        {state.files.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {state.files.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-zinc-600 bg-zinc-50 px-3 py-1.5 rounded-lg">
                                <FileText size={12} className="text-zinc-400 shrink-0" />
                                <span className="truncate flex-1">{file.name}</span>
                                {file.size !== "—" && <span className="text-zinc-400 shrink-0">{file.size}</span>}
                                <button onClick={() => removeFile(item.id, idx)} className="text-zinc-300 hover:text-red-400 transition-colors shrink-0">
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => fileInputRefs.current[item.id]?.click()}
                      className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${isDone ? "bg-zinc-100 text-zinc-500 hover:bg-zinc-200" : "bg-orange-500 text-white hover:bg-orange-600"}`}
                    >
                      <Upload size={12} />
                      {isDone ? "Replace" : "Upload"}
                    </button>

                    <input
                      type="file"
                      ref={(el) => { fileInputRefs.current[item.id] = el; }}
                      multiple={item.allowMultiple}
                      className="hidden"
                      onChange={(e) => handleFiles(item.id, e.target.files)}
                    />
                  </div>

                  {!isDone && (
                    <p className="text-xs text-zinc-400 mt-2 ml-9">Drag & drop or click Upload</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          {canSubmit ? (
            <div>
              <p className="text-sm font-semibold text-zinc-900 mb-1">Ready to submit!</p>
              <p className="text-xs text-zinc-400 mb-4">All required documents have been uploaded. You can submit now or continue adding optional documents.</p>
              <button onClick={() => setSubmitted(true)} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                Submit All Documents <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-zinc-900">Not ready to submit yet</p>
                <p className="text-xs text-zinc-400">Please upload all required documents before submitting.</p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-zinc-400 pb-6">
          <Shield size={12} className="inline mr-1" />
          Your files are encrypted and securely stored. Powered by DocPanther.
        </div>
      </main>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense>
      <UploadPortalContent />
    </Suspense>
  );
}
