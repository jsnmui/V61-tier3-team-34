"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import JobInfoCard from "@/components/JobInfoCard";
import { loadSession } from "@/lib/clientSession";

export default function JobSummaryPage() {
  const router = useRouter();
  const [session] = useState(() => loadSession());

  if (!session || !session.extractedJob) {
    return (
      <div className="flex flex-col min-h-screen md:flex-row">
        <Sidebar />
        <main id="main-content" className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="text-center max-w-sm">
            <h1 className="font-display text-2xl font-semibold text-ink mb-3">
              No job description analyzed yet
            </h1>
            <p className="text-sm text-ink/60 mb-6">
              Start by uploading or pasting a job description on the home page.
            </p>
            <Link
              href="/"
              className="inline-flex rounded-full bg-amber-dark px-6 py-2.5 text-sm font-semibold text-paper hover:bg-amber transition-colors focus-ring"
            >
              Go to home page
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const job = session?.extractedJob;

  return (
    <div className="flex flex-col min-h-screen md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main id="main-content" className="flex-1">
          <div className="max-w-4xl mx-auto px-6 py-10 md:py-14">
            <h1 className="font-display text-3xl font-semibold text-ink mb-1">
              Job Summary
            </h1>
            <p className="text-sm text-ink/60 mb-8">
              Here&apos;s what we found in the job description
            </p>

            {job && (
              <>
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <JobInfoCard label="Job Title" value={job.job_title} />
                  <JobInfoCard label="Work Type" value={job.type_of_work} />
                  <JobInfoCard label="Location" value={job.location} />
                  <JobInfoCard label="Experience" value={job.experience} />
                </div>

                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <JobInfoCard label="Required Skills" value={job.required_skills} />
                  <JobInfoCard label="Tools / Technologies" value={job.tools_and_technologies} />
                </div>

                <div className="rounded-xl border border-line bg-white p-5 mb-8">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50 mb-3">
                    Key Responsibilities
                  </h3>
                  {job.responsibilities?.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1.5 text-sm text-ink leading-relaxed">
                      {job.responsibilities.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink/40 italic">Not provided</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => router.push("/interview-questions")}
                    className="rounded-full bg-amber-dark px-6 py-2.5 text-sm font-semibold text-paper hover:bg-amber transition-colors focus-ring"
                  >
                    View Interview Questions
                  </button>
                  <button
                    onClick={() => router.push("/mock-interview")}
                    className="rounded-full border border-ink/15 px-6 py-2.5 text-sm font-semibold text-ink hover:bg-paper-alt transition-colors focus-ring"
                  >
                    Start Mock Interview
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
