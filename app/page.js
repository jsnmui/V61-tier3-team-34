"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { saveSession } from "@/lib/clientSession";

const WORD_LIMIT = 2000;
const ACCEPTED_EXTENSIONS = [".txt", ".pdf", ".docx"];

function countWords(text) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function WordCounter({ count }) {
  const over = count > WORD_LIMIT;
  return (
    <span className={`text-xs font-medium ${over ? "text-red-500" : "text-gray-400"}`}>
      {count} / {WORD_LIMIT} words
    </span>
  );
}

const TEAM = [
  { name: "Roger", role: "Scrum Master", initials: "RO", color: "#6366f1" },
  { name: "Thanasis", role: "Web Developer", initials: "TH", color: "#2563eb" },
  { name: "Jason", role: "Web Developer", initials: "JA", color: "#0891b2" },
  { name: "Vanessa", role: "Web Developer", initials: "VA", color: "#7c3aed" },
  { name: "Simbongile", role: "Web Developer", initials: "SI", color: "#059669" },
  { name: "Val", role: "Technical Guide", initials: "VA", color: "#d97706" },
];

const HOW_IT_WORKS = [
  { icon: "📋", step: "1", title: "Input Your Job Description", desc: "Paste the text or upload a TXT, PDF or DOCX file from any job listing." },
  { icon: "🤖", step: "2", title: "AI Analyses the Role", desc: "Our AI extracts key skills, responsibilities and requirements automatically." },
  { icon: "🎯", step: "3", title: "Practice with Personalised Questions", desc: "Get tailored technical, behavioural and experience-based interview questions." },
];

const WHY_FEATURES = [
  { icon: "⚡", title: "Save Hours", desc: "No more searching for generic questions. Everything is tailored to your specific role." },
  { icon: "🎯", title: "Role-Specific Questions", desc: "Questions are generated directly from the actual job requirements." },
  { icon: "🤖", title: "Powered by AI", desc: "Leverages advanced AI to understand context and requirements with precision." },
  { icon: "📈", title: "Boost Your Confidence", desc: "Walk into interviews knowing exactly what they are likely to ask." },
];

export default function HomePage() {
  const router = useRouter();

  // Input state
  const [pasteText, setPasteText] = useState("");
  const [file, setFile] = useState(null);
  const [fileWordCount, setFileWordCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [quantity, setQuantity] = useState(10);

  // Flow state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");

  const pasteWordCount = countWords(pasteText);

  const validateAndSetFile = useCallback(async (candidate) => {
    setFileError("");
    setFile(null);
    setFileWordCount(0);
    if (!candidate) return;
    const ext = "." + candidate.name.split(".").pop().toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setFileError(`"${candidate.name}" is not supported. Please upload a .txt, .pdf, or .docx file.`);
      return;
    }
    setFile(candidate);
    // Estimate word count for txt files only (pdf/docx need server parsing)
    if (ext === ".txt") {
      const text = await candidate.text();
      setFileWordCount(countWords(text));
    } else {
      setFileWordCount(0); // unknown until parsed
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const hasText = pasteText.trim().length >= 30;
    const hasFile = !!file;

    if (!hasText && !hasFile) {
      setError("Please paste a job description or upload a file.");
      return;
    }
    if (hasText && pasteWordCount > WORD_LIMIT) {
      setError(`Your text exceeds ${WORD_LIMIT} words. Please shorten it.`);
      return;
    }

    setIsLoading(true);
    try {
      let ingestRes;
      if (hasFile) {
        const formData = new FormData();
        formData.append("file", file);
        ingestRes = await fetch("/api/ingest", { method: "POST", body: formData });
      } else {
        ingestRes = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pasteText }),
        });
      }
      const ingestData = await ingestRes.json();
      if (!ingestRes.ok) throw new Error(ingestData.error || "Could not process the job description.");

      const parseRes = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: ingestData.sessionId, jdText: ingestData.jdText }),
      });
      const parseData = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseData.error || "Could not analyse the job description.");

      saveSession({
        sessionId: parseData.sessionId,
        jdText: ingestData.jdText,
        extractedJob: parseData.extractedJob,
        questions: null,
        quantityPerCategory: Math.ceil(quantity / 3),
      });

      router.push("/job-summary");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }


  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">

        {/* ── HERO ── */}
        <section  className="bg-bg-app pt-8 pb-20 md:pt-12 md:pb-28 text-gray-800 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              
              <span className="inline-block text-xs font-semibold uppercase tracking-widest bg-badge-bg text-badge-text px-3 py-1.5 rounded-full mb-5">
                AI-Powered Interview Preparation
              </span>
              
             <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5 text-navy">
              <span className="md:whitespace-nowrap">Turn any Job Description</span> <br />
              into Personalized <br />
              <span className="bg-gradient-to-r from-grad-start to-grad-end bg-clip-text text-transparent">
                Interview Questions
              </span>
            </h1>
              
              <p className="text-desc-text font-medium text-lg leading-loose mb-9 max-w-xl">
                  Upload or paste a job description and our AI will analyse the role,
                  extract key information, and generate tailored interview questions.
                </p>
              
              <div className="flex flex-wrap gap-4 text-sm font-medium">
                {["Save Time", "Practice Smarter", "Boost Confidence"].map((pill) => (
                  <span key={pill} className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-full px-4 py-2 text-gray-700">
                    <span className="text-badge-text font-bold">✓</span> {pill}
                  </span>
                ))}
              </div>
            </div>
            
           {/* Hero illustration */}
            <div className="flex-shrink-0 w-full md:w-[550px] h-[450px] relative">
              <Image 
                src="/home.png" 
                alt="DashFetch Hero Illustration"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </section>

        {/* ── INPUT SECTION ── */}
        <section className="pt-0 pb-14 bg-gray-50 -mt-10 md:-mt-14">
          <div className="max-w-5xl mx-auto px-6">
            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">

                {/* Two column inputs */}
                <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch mb-6">

                  {/* Paste area */}
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-2">
                      Paste Job Description
                    </label>
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="Paste the job description here…"
                      rows={8}
                      className="flex-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 placeholder:text-gray-400 focus-ring resize-none"
                    />
                    <div className="flex justify-end mt-1.5">
                      <WordCounter count={pasteWordCount} />
                    </div>
                  </div>

                  {/* OR divider */}
                  <div className="flex md:flex-col items-center justify-center gap-2 py-2">
                    <div className="flex-1 h-px md:h-auto md:w-px bg-gray-200" />
                    <span className="text-xs font-semibold text-gray-400 bg-white border border-gray-200 rounded-full px-2.5 py-1">OR</span>
                    <div className="flex-1 h-px md:h-auto md:w-px bg-gray-200" />
                  </div>

                  {/* Upload area */}
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-2">
                      Upload File
                    </label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); validateAndSetFile(e.dataTransfer.files?.[0]); }}
                      onClick={() => document.getElementById("file-input").click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") document.getElementById("file-input").click(); }}
                      className={`flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors focus-ring ${
                        isDragging ? "border-blue bg-blue-pale" : "border-gray-200 bg-gray-50 hover:border-blue hover:bg-blue-pale"
                      }`}
                    >
                      <input id="file-input" type="file" accept=".txt,.pdf,.docx" onChange={(e) => validateAndSetFile(e.target.files?.[0])} className="sr-only" />
                      <div className="w-14 h-14 relative flex items-center justify-center mb-1">
                    <Image 
                      src="/upload-cloud.png" 
                      alt="Upload Icon"
                      width={56}              
                      height={56}
                      className="object-contain"
                    />
                  </div>

                      {file ? (
                        <span className="text-sm font-medium text-blue">{file.name}</span>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-gray-600">Drag and drop your file here or click to upload</span>
                          <span className="text-xs text-gray-400">TXT, PDF or DOCX</span>
                        </>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-1.5">
                      {fileError ? (
                        <span className="text-xs text-red-500">{fileError}</span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {file && file.name.endsWith(".txt") ? "" : file ? "Word count available after processing" : ""}
                        </span>
                      )}
                      {file && file.name.endsWith(".txt") && (
                        <WordCounter count={fileWordCount} />
                      )}
                      {file && !file.name.endsWith(".txt") && (
                        <span className="text-xs text-gray-400">2000 word limit applies</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantity slider + Generate button */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4 flex-1">
                    <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                      Number of Questions
                    </label>
                    <span className="text-sm text-gray-400 font-medium">5</span>
                    <input
                      type="range"
                      min={5}
                      max={20}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="flex-1 accent-blue"
                      aria-label="Number of questions"
                    />
                    <span className="text-sm text-gray-400 font-medium">20</span>
                    <span className="text-sm font-bold text-blue w-6 text-center">{quantity}</span>
                  </div>

                 <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue px-7 py-3 text-sm font-semibold text-white hover:bg-blue-light transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-md shadow-blue/20"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analysing…
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Image 
                          src="/Button-image.png" 
                          alt="Button Icon"
                          width={16} 
                          height={16}
                          className="object-contain"
                        />
                        <span>Generate Questions</span>
                      </div>
                    )}
                  </button>
                </div>

                {error && (
                  <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>
                )}
              </div>
            </form>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-6">
            {[
              { icon: "🧠", title: "AI-Powered Analysis", desc: "Analyses skills, requirements and responsibilities from any job description automatically." },
              { icon: "❓", title: "Personalised Questions", desc: "Generates technical, behavioural and experience-based questions tailored to the role." },
              { icon: "🎤", title: "Mock Interview Ready", desc: "Practice with one question at a time, reveal sample answers and get STAR method tips." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-display font-semibold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="font-display text-3xl font-bold text-center text-gray-800 mb-12">
              How DashFetch Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.step} className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue flex items-center justify-center text-2xl mb-4 shadow-lg shadow-blue/20">
                    {step.icon}
                  </div>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden md:block absolute translate-x-40 translate-y-[-2.5rem] text-gray-300 text-2xl">→</div>
                  )}
                  <h3 className="font-display font-semibold text-gray-800 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY DASHFETCH ── */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="font-display text-3xl font-bold text-center text-gray-800 mb-12">
              Why choose DashFetch?
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
              {WHY_FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl bg-blue-pale border border-blue/10 p-5">
                  <div className="text-2xl mb-3">{f.icon}</div>
                  <h3 className="font-display font-semibold text-gray-800 text-sm mb-1.5">{f.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MEET THE TEAM ── */}
        <section className="py-16 bg-gray-50" id="about">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="font-display text-3xl font-bold text-center text-gray-800 mb-2">
              Meet our Team
            </h2>
            <p className="text-center text-gray-500 text-sm mb-10">Chingu Voyage V61 · Tier 3 · Team 34</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
              {TEAM.map((member) => (
                <div key={member.name} className="flex flex-col items-center text-center gap-2">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-display font-bold text-lg shadow-md"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
