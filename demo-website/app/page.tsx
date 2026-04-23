import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  CheckCircle2,
  Link2,
  FolderOpen,
  Zap,
  Shield,
  Bell,
  Download,
  Layers,
  ChevronRight,
  Building2,
  HeartPulse,
  GraduationCap,
  Scale,
  Home,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Build Checklists Your Way",
    desc: "Start from scratch, pick a template, or mix both. Mark items required or optional. Allow single or multiple file uploads per item.",
  },
  {
    icon: Link2,
    title: "Share One Link",
    desc: "Generate a unique upload link per case. Share via email, WhatsApp, or SMS. No login required for the recipient.",
  },
  {
    icon: FolderOpen,
    title: "Auto-Organized Storage",
    desc: "Choose flat or structured storage. Files land in the right folder automatically — one folder per case, or subfolders per checklist item.",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    desc: "Send one-click reminders to recipients who haven't uploaded yet. Track exactly what's missing per case.",
  },
  {
    icon: Download,
    title: "Download as ZIP",
    desc: "Download all documents for a case as a single ZIP — flat or with folder structure intact, exactly as you configured.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    desc: "All files encrypted at rest and in transit. Unique unguessable links. Audit trail for every upload.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create a Case",
    desc: "Enter a reference number, customer name, and tags. Choose a checklist template or build one on the fly. Set your storage mode.",
  },
  {
    number: "02",
    title: "Share the Link",
    desc: "Get a unique upload link instantly. Share it with your customer via any channel. They see your branding, not ours.",
  },
  {
    number: "03",
    title: "Collect & Download",
    desc: "Customer uploads documents against each checklist item. You see live status. Download everything as a ZIP when complete.",
  },
];

const useCases = [
  { icon: Building2, label: "Finance & Banking", examples: "Loan applications, KYC, account opening" },
  { icon: Users, label: "HR & Onboarding", examples: "Employee documents, BGV, offer letters" },
  { icon: Home, label: "Real Estate", examples: "Buyer KYC, title documents, NOCs" },
  { icon: Scale, label: "Legal & Compliance", examples: "Client intake, due diligence, filings" },
  { icon: HeartPulse, label: "Healthcare", examples: "Patient records, claims, referrals" },
  { icon: GraduationCap, label: "Education", examples: "Admissions, scholarships, enrolments" },
];

const pricing = [
  {
    name: "Starter",
    price: "₹2,999",
    per: "/month",
    desc: "For small teams just getting started",
    features: ["3 team members", "500 submissions/mo", "Custom subdomain", "Email reminders", "ZIP download"],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "₹7,999",
    per: "/month",
    desc: "For growing teams with higher volume",
    features: ["10 team members", "2,000 submissions/mo", "Custom subdomain", "Checklist templates", "Priority support", "Bulk reminders"],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    per: "",
    desc: "For large teams and enterprises",
    features: ["Unlimited members", "Unlimited submissions", "Custom domain (docs.yourbrand.com)", "SSO / SAML", "SLA guarantee", "Dedicated support"],
    cta: "Contact Us",
    highlight: false,
  },
];

function HeroMockup() {
  return (
    <div className="relative mx-auto max-w-sm w-full">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden cursor-pointer">
        <div className="bg-orange-500 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs">Reference: LN001234</p>
            <p className="text-white font-semibold">Rajesh Kumar</p>
          </div>
          <div className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">3 of 5 done</div>
        </div>
        <div className="px-5 py-2">
          <div className="w-full bg-zinc-100 rounded-full h-1.5 my-3">
            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: "60%" }} />
          </div>
        </div>
        <div className="px-5 pb-5 space-y-2">
          {[
            { name: "PAN Card", done: true, file: "pan_rajesh.pdf" },
            { name: "Aadhaar Card", done: true, file: "aadhaar_front.jpg" },
            { name: "Salary Slip", done: true, file: "salary_march.pdf" },
            { name: "Bank Statement", done: false, file: null },
            { name: "Passport Photo", done: false, file: null },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.done ? "bg-green-100" : "bg-zinc-200"}`}>
                  {item.done && <CheckCircle2 size={14} className="text-green-600" />}
                </div>
                <div>
                  <p className={`text-xs font-medium ${item.done ? "text-zinc-700" : "text-zinc-500"}`}>{item.name}</p>
                  {item.file && <p className="text-[10px] text-zinc-400">{item.file}</p>}
                </div>
              </div>
              {!item.done && (
                <span className="text-xs bg-orange-500 text-white px-3 py-1 rounded-lg font-medium">Upload</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <Link href="/demo/upload?token=abc123" className="absolute -top-3 -right-3 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg transition-colors">
        Live Demo →
      </Link>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Zap size={12} />
              Now in Beta — Free to start
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-zinc-900 leading-tight mb-6">
              Collect<br />Documents.<br />
              <span className="text-orange-500">Effortlessly.</span>
            </h1>
            <p className="text-lg text-zinc-500 leading-relaxed mb-8 max-w-md">
              Create custom checklists, share a link, and let anyone upload their documents — auto-organized exactly how you want.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/demo" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2">
                Start for Free <ChevronRight size={16} />
              </Link>
              <Link href="/demo" className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-6 py-3 rounded-xl transition-colors">
                View Demo
              </Link>
            </div>
            <p className="text-xs text-zinc-400 mt-4">No credit card required. Setup in under 2 minutes.</p>
          </div>
          <div className="flex justify-center">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-zinc-100 bg-zinc-50 py-10 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-zinc-400 font-medium mb-6">Used by teams across industries</p>
          <div className="flex flex-wrap justify-center gap-8 text-zinc-400 font-semibold text-sm">
            {["Finance Teams", "HR Departments", "Law Firms", "Real Estate Agencies", "Hospitals", "Universities"].map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-zinc-900 mb-4">Everything you need</h2>
            <p className="text-zinc-500 text-lg max-w-xl mx-auto">No more chasing documents over email. One link, one portal, everything organized.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-zinc-100 hover:border-orange-200 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 bg-orange-50 group-hover:bg-orange-100 rounded-xl flex items-center justify-center mb-4 transition-colors">
                  <f.icon size={20} className="text-orange-500" />
                </div>
                <h3 className="font-semibold text-zinc-900 mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Storage mode callout */}
      <section className="py-16 px-4 bg-zinc-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">You control how files are stored</h2>
          <p className="text-zinc-400 mb-10 text-lg">Choose flat or structured storage per case. Your files, your structure.</p>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
              <p className="text-orange-400 font-semibold text-sm mb-3">Flat Mode</p>
              <div className="font-mono text-xs text-zinc-400 space-y-1">
                <p className="text-zinc-300">📁 LN001234_RajeshKumar/</p>
                <p className="ml-4">📄 pan_card.pdf</p>
                <p className="ml-4">📄 aadhaar_front.jpg</p>
                <p className="ml-4">📄 salary_slip.pdf</p>
                <p className="ml-4">📄 bank_statement.pdf</p>
              </div>
              <p className="text-zinc-500 text-xs mt-4">All files in one folder. Great for simple workflows.</p>
            </div>
            <div className="bg-zinc-800 rounded-2xl p-6 border border-orange-500/30">
              <p className="text-orange-400 font-semibold text-sm mb-3">Structured Mode</p>
              <div className="font-mono text-xs text-zinc-400 space-y-1">
                <p className="text-zinc-300">📁 LN001234_RajeshKumar/</p>
                <p className="ml-4 text-zinc-300">📁 pan-card/</p>
                <p className="ml-8">📄 pan_card.pdf</p>
                <p className="ml-4 text-zinc-300">📁 aadhaar-card/</p>
                <p className="ml-8">📄 aadhaar_front.jpg</p>
                <p className="ml-4 text-zinc-300">📁 salary-slip/</p>
                <p className="ml-8">📄 salary_slip.pdf</p>
              </div>
              <p className="text-zinc-500 text-xs mt-4">Subfolder per checklist item. Great for automated pipelines.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-zinc-900 mb-4">Up and running in minutes</h2>
            <p className="text-zinc-500 text-lg">Three steps. That&apos;s it.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step, i) => (
              <div key={step.number} className="relative">
                <div className="text-6xl font-black text-orange-100 mb-4">{step.number}</div>
                <h3 className="text-xl font-bold text-zinc-900 mb-3">{step.title}</h3>
                <p className="text-zinc-500 leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 right-0 translate-x-1/2 text-zinc-200">
                    <ChevronRight size={32} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="py-24 px-4 bg-zinc-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-zinc-900 mb-4">Built for every team</h2>
            <p className="text-zinc-500 text-lg">If your work involves collecting documents from people, DocPanther is for you.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {useCases.map((uc) => (
              <div key={uc.label} className="bg-white rounded-2xl p-6 border border-zinc-100 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                  <uc.icon size={20} className="text-orange-500" />
                </div>
                <h3 className="font-bold text-zinc-900 mb-1">{uc.label}</h3>
                <p className="text-sm text-zinc-500">{uc.examples}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom subdomain */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-10 border border-orange-100 text-center">
            <h2 className="text-3xl font-extrabold text-zinc-900 mb-4">Your brand. Your subdomain.</h2>
            <p className="text-zinc-600 mb-8 max-w-xl mx-auto">
              Every customer gets their own branded upload portal. Your customers never see DocPanther — they see you.
            </p>
            <div className="flex flex-wrap justify-center gap-3 font-mono text-sm mb-6">
              {["hdfc.docpanther.com", "deloitte.docpanther.com", "citylaw.docpanther.com", "docs.yourbrand.com"].map((d) => (
                <span key={d} className="bg-white border border-orange-200 text-orange-700 px-4 py-2 rounded-lg shadow-sm">{d}</span>
              ))}
            </div>
            <p className="text-xs text-zinc-400">Enterprise plan supports fully custom domains (docs.yourbrand.com)</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-zinc-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-zinc-900 mb-4">Simple pricing</h2>
            <p className="text-zinc-500 text-lg">Start free. Scale when you&apos;re ready.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {pricing.map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-8 border ${plan.highlight ? "bg-orange-500 border-orange-500 shadow-xl md:-mt-4" : "bg-white border-zinc-100"}`}>
                <p className={`font-semibold text-sm mb-1 ${plan.highlight ? "text-orange-100" : "text-zinc-500"}`}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-4xl font-black ${plan.highlight ? "text-white" : "text-zinc-900"}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? "text-orange-200" : "text-zinc-400"}`}>{plan.per}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlight ? "text-orange-100" : "text-zinc-500"}`}>{plan.desc}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 size={15} className={plan.highlight ? "text-orange-100" : "text-green-500"} />
                      <span className={`text-sm ${plan.highlight ? "text-white" : "text-zinc-600"}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/demo" className={`block text-center font-semibold py-3 rounded-xl transition-colors ${plan.highlight ? "bg-white text-orange-500 hover:bg-orange-50" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl font-extrabold text-zinc-900 mb-6 leading-tight">
            Stop chasing documents.<br />
            <span className="text-orange-500">Start collecting them.</span>
          </h2>
          <p className="text-zinc-500 text-lg mb-10">Set up your first case in under 2 minutes. No credit card needed.</p>
          <Link href="/demo" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors">
            Get Started Free <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
