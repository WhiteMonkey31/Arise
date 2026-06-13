import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuthStore } from '../store/authStore'

function Header({ token }) {
  return (
    <header className="border-b border-(--border) fixed w-full top-0 bg-(--bg)/80 backdrop-blur-md z-30 transition-all duration-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="logo" className="size-9" />
          <span className="font-serif font-bold text-base text-(--text) tracking-tight">RFPilot</span>
        </div>

        <div className="flex items-center gap-2.5">
          {token ? (
            <Link to="/dashboard"
              className="rounded-xl bg-(--accent) hover:opacity-90 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login"
                className="rounded-xl border border-(--border) bg-(--surface) hover:bg-(--accent-bg) px-4 py-2 text-xs font-bold text-(--text) transition-all shadow-sm">
                Sign In
              </Link>
              <Link to="/register"
                className="rounded-xl bg-(--accent) hover:opacity-90 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-32 pb-20 flex flex-col lg:flex-row gap-14 items-center">
      {/* Left copy */}
      <div className="flex-1 space-y-7 fade-in">
        <div className="inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--surface) px-3 py-1 text-[10px] font-bold text-(--accent) shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Powered by Claude &amp; GPT-4o
        </div>

        <h1 className="font-serif font-bold text-4xl md:text-5xl text-(--text) tracking-tight leading-[1.1] text-balance">
          Win More Bids.<br />
          <span className="text-(--accent)">AI-drafted proposals</span><br />
          in minutes.
        </h1>

        <p className="text-sm text-(--muted) leading-relaxed font-medium max-w-lg">
          RFPilot reads complex RFP documents, maps compliance requirements to
          your capability library, and generates ready-to-submit proposal
          sections automatically.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link to="/register"
            className="rounded-2xl bg-(--accent) hover:opacity-90 px-6 py-3.5 text-xs font-bold text-white shadow-md transition-all hover:-translate-y-0.5 duration-200">
            Start Free Trial
          </Link>
          <a href="#features"
            className="rounded-2xl border border-(--border) bg-(--surface) hover:bg-(--accent-bg) px-6 py-3.5 text-xs font-bold text-(--text) transition-all shadow-sm">
            See How It Works
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-(--border)">
          {['Compliance Mapping', 'NIST & FedRAMP', 'AI Draft Versioning'].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span className="text-[11px] font-bold text-(--text)">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right widget mockup */}
      <div className="flex-1 relative slide-up delay-100">
        <div className="absolute inset-0 bg-(--accent)/8 rounded-[40px] blur-3xl pointer-events-none" />
        <div className="relative rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-[var(--shadow-lg)] space-y-5">
          <div className="flex items-center justify-between border-b border-(--border) pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-(--muted)">Live Evaluation</span>
            <span className="text-[10px] font-bold text-(--accent) bg-(--accent-bg) border border-(--border) px-2.5 py-0.5 rounded-lg">
              RFP Analysis
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="font-serif font-bold text-sm text-(--text) leading-snug">
              US Federal Cloud Infrastructure Upgrade
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30 text-[9px] font-bold px-2 py-0.5">
                IT Services
              </span>
              <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/10 text-[9px] font-bold px-2 py-0.5">
                76% Win Probability
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-(--muted) block">
              Compliance Check
            </span>
            {[
              { id: 'REQ-01', text: 'Multi-factor PIV/CAC Login', status: 'PASS', evidence: 'CAP-102' },
              { id: 'REQ-02', text: 'Zero-Downtime Failover', status: 'PASS', evidence: 'CAP-101' },
              { id: 'REQ-04', text: 'PII Log Scrubbing Protocol', status: 'GAP',  evidence: '—' },
            ].map((req) => (
              <div key={req.id}
                className="rounded-xl border border-(--border) p-3 bg-(--surface-2) flex items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="font-bold text-(--text) text-[11px] truncate">{req.id}: {req.text}</p>
                  <p className="text-[10px] text-(--muted) truncate">Evidence: {req.evidence}</p>
                </div>
                <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                  req.status === 'PASS'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/20'
                    : 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/20'
                }`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>

          <Link to="/register"
            className="block w-full text-center rounded-xl bg-(--accent-bg) border border-(--border) hover:border-(--accent) p-2.5 text-[10px] font-bold text-(--accent) transition-all">
            Upload RFP &amp; Test Your Score →
          </Link>
        </div>
      </div>
    </section>
  )
}

function MetricsBanner() {
  const stats = [
    { value: '10x',  label: 'Faster Drafting Speed' },
    { value: '78%',  label: 'Average Win Rate Increase' },
    { value: '$32M+',label: 'Proposal Value Generated' },
    { value: 'Zero', label: 'Missed Compliance Checks' },
  ]
  return (
    <section className="border-y border-(--border) bg-(--surface)">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((s, i) => (
          <div key={i} className="space-y-1.5 stagger-fade" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="font-serif font-bold text-3xl md:text-4xl text-(--text)">{s.value}</div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CoreFeatures() {
  const features = [
    {
      num: '01',
      title: 'Smart RFP Extraction',
      desc: 'Upload PDF or DOCX guidelines. NLP pipeline reads instantly, compiling every mandated requirement into a structured checklist.',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
    },
    {
      num: '02',
      title: 'Compliance Auditing',
      desc: 'Scan requirements against your library, identify resource gaps early, and map credentials like FedRAMP High, ISO 27001, and SOC 2.',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08" />,
    },
    {
      num: '03',
      title: 'AI Proposal Drafting',
      desc: 'Generate fully articulated response texts with specific evidence citations. Refine with the built-in word counter and version history.',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />,
    },
    {
      num: '04',
      title: 'Win Score Evaluation',
      desc: 'Real-time 6-axis bid fit scoring. Check benchmarks for compliance rate, sector match, and past win history to optimize Go/No-Go decisions.',
      icon: <><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" /></>,
    },
  ]

  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-20 md:py-28 space-y-14">
      <div className="text-center max-w-xl mx-auto space-y-3 fade-in">
        <span className="text-[9px] uppercase font-bold tracking-wider text-(--accent)">Precision Architecture</span>
        <h2 className="font-serif font-bold text-2xl md:text-3xl text-(--text)">Supercharge your bid lifecycle</h2>
        <p className="text-xs text-(--muted) font-medium font-sans leading-relaxed">
          Everything proposal teams need to read, check, verify, and write winning contract responses.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((f, i) => (
          <div
            key={i}
            className="rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-[var(--shadow-sm)] space-y-4 hover:shadow-[var(--shadow-md)] hover:-translate-y-1 transition-all duration-200 stagger-fade"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-(--accent-bg) border border-(--border) text-(--accent) flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">{f.icon}</svg>
              </div>
              <span className="font-mono text-[10px] font-bold text-(--muted)">{f.num}</span>
            </div>
            <h3 className="font-serif font-bold text-sm text-(--text)">{f.title}</h3>
            <p className="text-xs text-(--muted) leading-relaxed font-medium font-sans">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-(--border) py-8 bg-(--surface)">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="logo" className="size-7" />
          <span className="font-serif font-bold text-sm text-(--text)">RFPilot</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-(--muted)">
          © 2026 RFPilot Inc. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  const { token } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (token) navigate('/dashboard')
  }, [token, navigate])

  return (
    <div className="min-h-screen text-(--text) overflow-x-hidden">
      <Header token={token} />
      <Hero />
      <MetricsBanner />
      <CoreFeatures />
      <Footer />
    </div>
  )
}
