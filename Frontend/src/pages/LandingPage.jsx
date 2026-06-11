import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "../store/authStore";

const Header = (token) => {


  return (
    <header className="border-b border-(--border) fixed w-full top-0 bg-white/55 backdrop-blur-sm z-30 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-(--accent) flex items-center justify-center text-white font-serif font-semibold text-lg shadow-sm">
            A
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg leading-none tracking-tight">
              Arise
            </h1>
            <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">
              RFP Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {token ? (
            <Link
              to="/dashboard"
              className="rounded-xl bg-(--accent) hover:opacity-95 px-4.5 py-2.5 text-xs font-bold text-white shadow-sm transition"
            >
              Go to Workspace
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl border border-(--border) bg-(--surface) hover:bg-(--accent-bg) px-4 py-2.5 text-xs font-bold transition shadow-sm"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-(--accent) hover:opacity-95 px-4.5 py-2.5 text-xs font-bold text-white shadow-sm transition"
              >
                Create Organization
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

const Hero = () => {
  return (
    <section className="max-w-7xl mx-auto px-6 md:py-16 flex flex-col lg:flex-row justify-center items-center relative z-10">
      <div className="flex-1 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--surface) px-3 py-1 text-[10px] font-bold text-(--accent) shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Empowered with Gemini 1.5 Pro
        </div>
        <h2 className="font-serif font-bold text-4xl md:text-5xl lg:text-6xl text-(--text) tracking-tight leading-[1.08] text-balance">
          Win More Bids. <br />
          <span className="text-(--accent)">Automate proposal drafting</span> in
          minutes.
        </h2>
        <p className="text-sm md:text-base text-(--muted) leading-relaxed font-medium max-w-xl text-balance">
          Arise analyzes complex government and commercial RFP documents,
          extracts mandatory compliance items, maps capability certifications,
          and generates ready-to-submit proposal drafts automatically.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            to="/register"
            className="rounded-2xl bg-(--accent) hover:opacity-95 px-6.5 py-4 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 duration-200"
          >
            Start Free Trial →
          </Link>
          <a
            href="#features"
            className="rounded-2xl border border-(--border) bg-(--surface) hover:bg-(--accent-bg) px-6.5 py-4 text-xs font-bold transition shadow-sm"
          >
            How It Works
          </a>
        </div>

        {/* Core features mini bullets */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6 border-t border-(--border)">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
            <span className="text-[11px] font-bold text-(--text)">
              Compliance Mapping
            </span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
            <span className="text-[11px] font-bold text-(--text)">
              NIST & FedRAMP Audits
            </span>
          </div>
          <div className="flex items-center gap-2 col-span-2 md:col-span-1">
            <svg
              className="w-4 h-4 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
            <span className="text-[11px] font-bold text-(--text)">
              AI Draft Versioning
            </span>
          </div>
        </div>
      </div>

      {/* Hero Interactive Widget Card Mockup */}
      <div className="lg:col-span-5 relative flex-1">
        <div className="absolute inset-0 bg-(--accent)/10 rounded-[40px] blur-3xl" />
        <div className="relative rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-(--border) pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-(--muted)">
              Active Evaluation
            </span>
            <span className="text-[10px] font-bold text-(--accent) bg-(--accent-bg) border border-(--border) px-2.5 py-0.5 rounded-lg">
              RFP Analysis
            </span>
          </div>

          {/* Mock RFP Details */}
          <div className="space-y-2">
            <div className="font-serif font-bold text-sm leading-tight text-(--text)">
              US Federal Cloud Infrastructure Upgrade (FAA)
            </div>
            <div className="flex gap-2">
              <span className="rounded-lg bg-stone-150/40 dark:bg-stone-800 text-[9px] font-bold px-2 py-0.5 text-(--muted)">
                IT Services
              </span>
              <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/10 text-[9px] font-bold px-2 py-0.5">
                76% Win Probability
              </span>
            </div>
          </div>

          {/* Mock compliance requirements status */}
          <div className="space-y-3 pt-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-(--muted) block">
              Compliance Gap Check
            </span>

            <div className="space-y-2">
              <div className="rounded-xl border border-(--border) p-2.5 bg-(--bg) flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-(--text) text-[11px]">
                    REQ-01: Multi-factor PIV/CAC Login
                  </p>
                  <p className="text-[10px] text-(--muted)">
                    Evidence: Certified USDA IAM portal (CAP-102)
                  </p>
                </div>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/10 px-2 py-0.5 rounded-md">
                  PASS
                </span>
              </div>

              <div className="rounded-xl border border-(--border) p-2.5 bg-(--bg) flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-(--text) text-[11px]">
                    REQ-02: Zero-Downtime Failover
                  </p>
                  <p className="text-[10px] text-(--muted)">
                    Evidence: Active AWS multi-region setup (CAP-101)
                  </p>
                </div>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/10 px-2 py-0.5 rounded-md">
                  PASS
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/register"
              className="w-full text-center block rounded-xl bg-(--accent-bg) border border-(--border) hover:border-(--accent) p-2.5 text-[10px] font-bold text-(--accent) transition"
            >
              Upload RFP & Test Your Score →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const MetricsBanner = () => {
  return (
    <section
      id="metrics"
      className="border-y border-(--border) bg-(--surface) transition-all duration-200"
    >
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div className="space-y-1">
          <div className="font-serif font-bold text-3xl md:text-4xl text-(--text)">
            10x
          </div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">
            Faster Drafting Speed
          </div>
        </div>
        <div className="space-y-1">
          <div className="font-serif font-bold text-3xl md:text-4xl text-(--text)">
            78%
          </div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">
            Average Win Rate Increase
          </div>
        </div>
        <div className="space-y-1">
          <div className="font-serif font-bold text-3xl md:text-4xl text-(--text)">
            $32M+
          </div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">
            Proposal Value Generated
          </div>
        </div>
        <div className="space-y-1">
          <div className="font-serif font-bold text-3xl md:text-4xl text-(--text)">
            Zero
          </div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">
            Missed Compliance Checks
          </div>
        </div>
      </div>
    </section>
  );
};

const CoreFeatures = () => {
  const features = [
    {
      title: "1. Smart RFP Extraction",
      description:
        "Upload PDF or DOCX RFP guidelines. Our NLP pipeline reads documents instantly, compiling a complete checklist of mandated requirements.",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      ),
    },
    {
      title: "2. Compliance Auditing",
      description:
        "Scan requirements against your library to identify resource gaps early. Map security credentials like FedRAMP High, ISO 27001, and SOC 2.",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08"
          />
        </svg>
      ),
    },
    {
      title: "3. Dynamic Drafting",
      description:
        "Generate fully articulated response texts containing specific evidence and capability citations. Polish writing with the built-in word counter.",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
          />
        </svg>
      ),
    },
    {
      title: "4. Win Score Evaluation",
      description:
        "Access real-time bid fit scoring. Check benchmarks for compliance rate, sector match, and past win history to optimize Go/No-Go decisions.",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z"
          />
        </svg>
      ),
    },
  ];
  return (
    <section
      id="features"
      className="max-w-7xl mx-auto px-6 py-20 md:py-28 space-y-16"
    >
      <div className="text-center max-w-xl mx-auto space-y-3">
        <span className="text-[9px] uppercase font-bold tracking-wider text-(--accent)">
          Precision Architecture
        </span>
        <h3 className="font-serif font-bold text-2xl md:text-3xl text-(--text)">
          Supercharge your bid lifecycle
        </h3>
        <p className="text-xs text-(--muted) font-medium font-sans">
          Everything proposal teams need to read, check, verify, and write
          winning contract proposals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-xs space-y-4 hover:shadow-md transition"
          >
            <div className="h-9 w-9 rounded-xl bg-(--accent-bg) border border-(--border) text-(--accent) flex items-center justify-center">
              {feature.icon}
            </div>
            <h4 className="font-serif font-bold text-base text-(--text)">
              {feature.title}
            </h4>
            <p className="text-xs text-(--muted) leading-relaxed font-medium font-sans">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export const Footer = () => {
  return (
    <footer className="border-t border-(--border) py-8 bg-(--surface) transition-all duration-200 relative z-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-(--accent) flex items-center justify-center text-white font-serif font-semibold text-md shadow-sm">
            A
          </div>
          <span className="font-serif font-bold text-sm text-(--text)">
            Arise
          </span>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wider text-(--muted) font-sans">
          © 2026 Arise Inc. All rights reserved. Bid Response Engine.
        </p>
      </div>
    </footer>
  );
};

export default function LandingPage() {
  const { token } = useAuthStore();
  const navigate = useNavigate();

  // Auto-redirect to dashboard if token exists
  useEffect(() => {
    if (token) {
      navigate("/dashboard");
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen text-(--text) transition-colors duration-200 select-none overflow-x-hidden relative">
      {/* Header */}
      <Header token={token} />

      {/* Hero Section */}
      <Hero />

      {/* Metrics Banner */}
      <MetricsBanner />

      {/* Core Features Details */}
      <CoreFeatures />

      {/* Footer */}
      <Footer />
    </div>
  );
}
