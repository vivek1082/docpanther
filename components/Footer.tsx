import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-100 bg-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">DP</span>
              </div>
              <span className="font-bold text-zinc-900">DocPanther</span>
            </div>
            <p className="text-sm text-zinc-500 max-w-xs">
              The fastest way to collect documents from anyone, organized your way.
            </p>
          </div>

          <div className="flex gap-12 text-sm">
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-zinc-900 mb-1">Product</p>
              <a href="#features" className="text-zinc-500 hover:text-zinc-900 transition-colors">Features</a>
              <a href="#pricing" className="text-zinc-500 hover:text-zinc-900 transition-colors">Pricing</a>
              <Link href="/demo" className="text-zinc-500 hover:text-zinc-900 transition-colors">Demo</Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-zinc-900 mb-1">Use Cases</p>
              <span className="text-zinc-500">Finance & Banking</span>
              <span className="text-zinc-500">HR & Onboarding</span>
              <span className="text-zinc-500">Real Estate</span>
              <span className="text-zinc-500">Legal & Compliance</span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-zinc-400">
          <p>© 2026 DocPanther. All rights reserved.</p>
          <p>Made with ❤️ for teams that hate chasing documents</p>
        </div>
      </div>
    </footer>
  );
}
