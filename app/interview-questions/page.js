"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { loadSession, saveSession } from "@/lib/clientSession";

const CATEGORIES = [
  { key: "technical", label: "Technical Questions" },
  { key: "behavioral", label: "Behavioral Questions" },
  { key: "experience", label: "Experience Questions" },
];

export default function InterviewQuestionsPage() {
  const router = useRouter();
  const [session, setSession] = useState(() => loadSession());
  const [activeCategory, setActiveCategory] = useState("technical");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy All Questions");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.extractedJob && !session?.questions) {
      generateQuestions(session);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateQuestions(data) {
    setIsGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: data.sessionId,
          extractedJob: data.extractedJob,
          quantityPerCategory: data.quantityPerCategory,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not generate questions.");

      saveSession({ questions: result.questions });
      setSession((prev) => ({ ...prev, questions: result.questions }));
    } catch (err) {
      setError(err.message || "Something went wrong generating questions.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCopyAll() {
    const list = session?.questions?.[activeCategory] || [];
    const text = list.map((q, i) => `${i + 1}. ${q.question}`).join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopyLabel("Copied!");
        setTimeout(() => setCopyLabel("Copy All Questions"), 2000);
      })
      .catch(() => setError("Couldn't copy to clipboard."));
  }

  if (!session?.extractedJob) {
    return (
      <div className="flex flex-col min-h-screen md:flex-row">
        <Sidebar />
        <main id="main-content" className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="text-center max-w-sm">
            <h1 className="font-display text-2xl font-semibold text-ink mb-3">
              No job description analyzed yet
            </h1>
            <Link
              href="/"
              className="inline-flex rounded-xl bg-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-light transition-colors focus-ring cursor-pointer"
            >
              Go to home page
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const questionList = session?.questions?.[activeCategory] || [];

  return (
    <div className="flex flex-col min-h-screen md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main id="main-content" className="flex-1">
          <div className="max-w-4xl mx-auto px-6 py-10 md:py-14">
            <h1 className="font-display text-3xl font-semibold text-ink mb-1">
              Interview Questions
            </h1>
            <p className="text-sm text-ink/60 mb-8">
              Personalized questions based on your job description
            </p>

            <div
              role="tablist"
              aria-label="Question category"
              className="flex gap-2 mb-6 overflow-x-auto p-1"
              onKeyDown={(e) => {
                const tabs = CATEGORIES.map(cat => cat.key);
                const currentIndex = tabs.indexOf(activeCategory);
                if (e.key === "ArrowRight") {
                  const nextIndex = (currentIndex + 1) % tabs.length;
                  setActiveCategory(tabs[nextIndex]);
                  e.currentTarget.querySelectorAll('button')[nextIndex].focus();
                } else if (e.key === "ArrowLeft") {
                  const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                  setActiveCategory(tabs[prevIndex]);
                  e.currentTarget.querySelectorAll('button')[prevIndex].focus();
                }
              }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  role="tab"
                  aria-selected={activeCategory === cat.key}
                  tabIndex={activeCategory === cat.key ? 0 : -1}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors focus-ring cursor-pointer ${
                    activeCategory === cat.key
                      ? "bg-blue text-white hover:bg-blue-light"
                      : "bg-paper-alt text-ink/60 hover:text-ink"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {error && (
              <p role="alert" className="mb-4 text-sm text-error font-medium bg-red-50 p-2 rounded-lg border border-red-100 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}

            <div aria-live="polite" className="sr-only">
              {isGenerating ? "Generating your questions, please wait..." : (questionList.length > 0 ? `Loaded ${questionList.length} questions.` : "")}
            </div>

            {isGenerating ? (
              <p className="text-sm text-ink/60 flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
                Generating your questions…
              </p>
            ) : questionList.length === 0 ? (
              <p className="text-sm text-ink/40 italic">No questions available.</p>
            ) : (
              <ol className="space-y-4 mb-8">
                {questionList.map((q, i) => (
                  <li
                    key={q.id || i}
                    className="rounded-xl border border-line bg-white p-5"
                  >
                    <p className="text-sm font-medium text-ink mb-1">
                      <span className="text-blue mr-2">{i + 1}.</span>
                      {q.question}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyAll}
                disabled={questionList.length === 0}
                className="rounded-xl bg-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-light transition-colors focus-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copyLabel}
              </button>
              <button
                onClick={() => generateQuestions(session)}
                disabled={isGenerating}
                className="rounded-xl bg-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-light transition-colors focus-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Generating…" : "Generate New Questions"}
              </button>
              <button
                onClick={() => router.push("/mock-interview")}
                className="rounded-xl bg-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-light transition-colors focus-ring cursor-pointer"
              >
                Start Mock Interview
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
