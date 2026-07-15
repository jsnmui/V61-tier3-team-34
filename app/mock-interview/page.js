"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { loadSession } from "@/lib/clientSession";

const STAR_STEPS = [
  { letter: "S", label: "Situation", text: "Set the scene — what was the context?" },
  { letter: "T", label: "Task", text: "What were you responsible for?" },
  { letter: "A", label: "Action", text: "What did you specifically do?" },
  { letter: "R", label: "Result", text: "What was the outcome?" },
];

function flattenQuestions(questions) {
  if (!questions) return [];
  return ["technical", "behavioral", "experience"].flatMap((category) =>
    (questions[category] || []).map((q) => ({ ...q, category }))
  );
}

export default function MockInterviewPage() {
  const [session] = useState(() => loadSession());
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const questionHeadingRef = useRef(null);

  const allQuestions = useMemo(() => flattenQuestions(session?.questions), [session]);
  const current = allQuestions[index];

  useEffect(() => {
    if (current && questionHeadingRef.current) {
      questionHeadingRef.current.focus();
    }
  }, [index, current]);

  function goNext() {
    if (index < allQuestions.length - 1) {
      setIndex(index + 1);
      setShowAnswer(false);
    }
  }

  function goPrevious() {
    if (index > 0) {
      setIndex(index - 1);
      setShowAnswer(false);
    }
  }

  if (allQuestions.length === 0) {
    return (
      <div className="flex flex-col min-h-screen md:flex-row">
        <Sidebar />
        <main id="main-content" className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="text-center max-w-sm">
            <h1 className="font-display text-2xl font-semibold text-ink mb-3">
              No questions to practice yet
            </h1>
            <p className="text-sm text-ink/60 mb-6">
              Generate interview questions first, then come back here to practice.
            </p>
            <Link
              href="/interview-questions"
              className="inline-flex rounded-xl bg-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-light transition-colors focus-ring cursor-pointer"
            >
              Go to Interview Questions
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main id="main-content" className="flex-1">
          <div className="max-w-4xl mx-auto px-6 py-10 md:py-14">
            <h1 className="font-display text-3xl font-semibold text-ink mb-1">
              Mock Interview
            </h1>
            {current && (
              <p className="text-sm text-ink/60 mb-8">
                Question {index + 1} of {allQuestions.length}
              </p>
            )}

            {current && (
              <div className="grid md:grid-cols-[1fr_240px] gap-6">
                <div>
                  <div className="rounded-xl border border-line bg-white p-6 mb-4">
                    <span className="inline-block text-xs font-semibold uppercase tracking-wide text-blue mb-3">
                      {current.category}
                    </span>
                    <p
                      ref={questionHeadingRef}
                      tabIndex={-1}
                      className="text-lg text-ink leading-relaxed font-medium focus:outline-none"
                    >
                      {current.question}
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAnswer((v) => !v)}
                    aria-expanded={showAnswer}
                    className="rounded-xl bg-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-light transition-colors focus-ring cursor-pointer mb-4"
                  >
                    {showAnswer ? "Hide Answer" : "Show Answer"}
                  </button>

                  {showAnswer && (
                    <div className="rounded-xl bg-paper-alt border border-line p-5 mb-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50 mb-2">
                        Sample Answer
                      </h3>
                      <p className="text-sm text-ink leading-relaxed">
                        {current.sample_answer || "No sample answer available."}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={goPrevious}
                      disabled={index === 0}
                      className="rounded-xl bg-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-light transition-colors focus-ring cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={goNext}
                      disabled={index === allQuestions.length - 1}
                      className="rounded-xl bg-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-light transition-colors focus-ring cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    <Link
                      href="/"
                      className="ml-auto rounded-xl bg-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-light transition-colors focus-ring cursor-pointer"
                    >
                      New Analysis
                    </Link>
                  </div>
                </div>

                <aside className="rounded-xl border border-line bg-white p-5 h-fit">
                  <h3 className="font-display text-base font-semibold text-ink mb-2">
                    Tips
                  </h3>
                  <p className="text-sm text-ink/60 mb-4">
                    Take your time to think and structure your answer.
                  </p>
                  <ul className="space-y-3">
                    {STAR_STEPS.map((step) => (
                      <li key={step.letter} className="flex gap-3">
                        <span className="flex items-center justify-center w-7 h-7 shrink-0 rounded-full bg-blue text-white text-xs font-bold">
                          {step.letter}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-ink">{step.label}</p>
                          <p className="text-xs text-ink/50">{step.text}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </aside>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
