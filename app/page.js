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
  {
    name: "Roger",
    role: "Scrum Master",
    image: "/picture-default.png", 
    github: "https://github.com/",
    linkedin: "https://linkedin.com/"
  },
  {
    name: "Val Lysenko",
    role: "Technical Guide",
    image: "/picture-val.jpg", 
    github: "https://github.com/Valeriusdev",
    linkedin: "https://www.linkedin.com/in/valeriylysenko/"
  },
  {
    name: "Vanessa Santos",
    role: "Web Develope",
    image: "/picture-vanessa.jpg", 
    github: "https://github.com/nessa-dev",
    linkedin: "https://www.linkedin.com/in/vanessa-dev-santos/"
  },
  {
    name: "Simbongile Mkhotheli",
    role: "Web Developer",
    image: "/picture-simbongile.png", 
    github: "https://github.com/simbongile-mkhotheli",
    linkedin: "https://www.linkedin.com/in/mkoteli/"
  },
  {
    name: "Thanasis Koufos",
    role: "Web Developer",
    image: "/picture-thanasis.png",  // γραμμή 58 - Thanasis 
    github: "https://github.com/ThanasisSoftwareDeveloper",
    linkedin: "https://www.linkedin.com/in/thanasis-koufos-software-developer/"
  },
  {
    name: "Jason",
    role: "Web Developer",
    image: "/picture-default.png", 
    github: "https://github.com/",
    linkedin: "https://linkedin.com/"
  }
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Upload Your Job Description",
    desc: "Paste the text or ipload a TXT/PDF file of the job description.",
    icon: "/icon-doc-home.png",      
  },
  {
    step: 2,
    title: "AI Analyzes the Role",
    desc: "Our AI extracts key skills, experience, responsibilities and requirements.",
    icon: "/icon-AI-home.png",       
  },
  {
    step: 3,
    title: "Practice with Questions",
    desc: "Get technical, behavioral and experience-based interview questions.",
    icon: "/icon-mensage-home.png",  
  },
];

const WHY_FEATURES = [
  { 
    icon: "/icon-ray-home.png", 
    title: "Save Hours", 
    desc: "No more searching for generic questions. Everything is tailored to your specific role." 
  },
  { 
    icon: "/icon-focus-home.png", 
    title: "Role-Specific Questions", 
    desc: "Questions are generated directly from the actual job requirements." 
  },
  { 
    icon: "/icon-robot-home.png", 
    title: "Powered by AI", 
    desc: "Leverages advanced AI to understand context and requirements with precision." 
  },
  { 
    icon: "/icon-progress-home.png", 
    title: "Boost Your Confidence", 
    desc: "Walk into interviews knowing exactly what they are likely to ask." 
  },
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
      setFileWordCount(0); 
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
      <section className="bg-bg-app pt-8 pb-20 md:pt-12 md:pb-28 text-gray-800 overflow-hidden">
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
        
         <div className="flex flex-wrap gap-6 text-sm font-semibold text-gray-700">
            {["Save Time", "Practice Smarter", "Boost Confidence"].map((pill) => (
              <span key={pill} className="flex items-center gap-3 select-none">
                <span className="w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center shrink-0">
                  <span className="block w-1.5 h-2.5 border-r-2 border-b-2 border-white rotate-45 -mt-0.5" />
                </span>
                {pill}
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
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
    {[
      { 
        icon: (
          <svg className="w-8 h-8 text-[#6366F1]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        ), 
        title: "Ai-Powered Analysis", 
        desc: "Extracts skills, requirements and key responsibilities." 
      },
      { 
        icon: (
          <svg className="w-8 h-8 text-[#6366F1]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ), 
        title: "Personalized Questions", 
        desc: "Generates technical, behavioral and experience-based questions." 
      },
      { 
        icon: (
          <svg className="w-8 h-8 text-[#6366F1]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ), 
        title: "Mock Interview Ready", 
        desc: "Practice with AI-powered mock interviews." 
      },
    ].map((f) => (
      <div key={f.title} className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-[#EEF2FF] flex items-center justify-center shrink-0">
          {f.icon}
        </div>
        <div className="pt-1"> 
          <h3 className="text-sm font-bold text-slate-800 mb-1">{f.title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
        </div>
      </div>
    ))}
  </div>
</section>

{/* ── HOW IT WORKS ── */}
<section className="py-16 bg-gray-50">
  <div className="max-w-6xl mx-auto px-6">
    <h2 className="font-display text-3xl font-bold text-center text-gray-800 mb-16">
      How DashFetch Works
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start relative">
      <div className="hidden md:flex absolute top-8 left-[20%] w-[12%] items-center z-10">
        <div className="flex-1 border-t-2 border-dashed border-arrow-blue"></div>
        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-arrow-blue -ml-1"></div>
      </div>

      <div className="hidden md:flex absolute top-8 left-[54%] w-[12%] items-center z-10">
        <div className="flex-1 border-t-2 border-dashed border-arrow-blue"></div>
        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-arrow-blue -ml-1"></div>
      </div>

      {HOW_IT_WORKS.map((step, i) => (
        <div key={i} className="flex flex-col items-center md:items-start text-center md:text-left px-4">
          <div className="flex items-center justify-center gap-3 mb-6 relative">
            <div className="w-8 h-8 rounded-full bg-step-purple text-white flex items-center justify-center text-sm font-bold shrink-0 z-20">
              {i + 1}
            </div>
            
            <div className="w-16 h-16 rounded-xl bg-icon-box-bg flex items-center justify-center shrink-0 overflow-hidden relative z-20">
              <Image 
                src={step.icon} 
                alt=""
                width={32}      
                height={32}
                className="object-contain w-8 h-8"
              />
            </div>
          </div>
          <h3 className="font-display font-semibold text-gray-800 mb-2 max-w-[220px]">
            {step.title}
          </h3>
          <p className="text-sm text-desc-text leading-relaxed max-w-[260px]">
            {step.desc}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>

 {/* ── WHY DASHFETCH ── */}
<section className="py-16 bg-white">
  <div className="max-w-7xl mx-auto px-6">
    <h2 className="font-display text-3xl font-bold text-center text-gray-800 mb-12">
      Why choose DashFetch?
    </h2>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {WHY_FEATURES.map((f) => (
        <div 
          key={f.title} 
          className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-4 shadow-xs"
        >
          <div className="w-16 h-16 flex items-center justify-center shrink-0 relative">
            <Image 
              src={f.icon} 
              alt=""
              width={56} 
              height={56}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="font-sans font-bold text-gray-800 text-sm mb-1">
              {f.title}
            </h3>
            <p className="text-[11px] text-gray-500 leading-normal max-w-[180px]">
              {f.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>


{/* ── MEET THE TEAM ── */}
<section className="pt-4 pb-16 bg-white overflow-hidden" id="about">
    <div className="max-w-7xl mx-auto px-6">
    
    {/* Title and Purple Decorative Line */}
    <div className="flex flex-col items-center justify-center mb-2">
      <h2 className="font-display text-3xl font-bold text-center text-gray-800">
        Meet our Team
      </h2>
      <div className="w-10 h-1 bg-gradient-to-r from-grad-start to-grad-end rounded-full mt-2"></div>
    </div>
    
    <p className="text-center text-gray-500 text-sm mb-8">
      Chingu Voyage V61 · Tier 3 · Team 34
    </p>

   {/* CAROUSEL AND CONTROL BUTTONS */}
    <div className="relative w-full">
      
      {/* Scroll Container */}
      <div 
        className="w-full overflow-x-auto pb-6 pt-1 scroll-smooth select-none scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex flex-row gap-5 w-max px-2">
          {TEAM.map((member, i) => (
            <div 
              key={member.name + i} 
              className="w-[290px] bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs hover:shadow-md transition-shadow duration-300 shrink-0"
            >
              <div className="w-20 h-20 rounded-full border border-gray-100 overflow-hidden shrink-0 relative bg-gray-50">
                <Image 
                  src={member.image} 
                  alt={member.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
                 <div className="flex flex-col justify-between h-full py-1">
                <div>
                  <h3 className="font-sans font-bold text-gray-800 text-base leading-tight">
                    {member.name}
                  </h3>
                  <p className="text-xs text-badge-text font-medium mt-0.5">
                    {member.role}
                  </p>
                </div>
                  <div className="flex items-center gap-3 mt-3">
                  <a 
                    href={member.github} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-gray-500 font-medium hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                  
                  <a 
                    href={member.linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-gray-500 font-medium hover:text-blue-600 transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#0077B5]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                    <span>LinkedIn</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

     {/* Button */}
    <button 
      onClick={() => {
        const container = document.querySelector('.overflow-x-auto');
        if (container) {
          const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
          if (isAtEnd) {
            container.scrollTo({ left: 0, behavior: 'smooth' }); // Volta pro início
          } else {
            container.scrollBy({ left: 310, behavior: 'smooth' }); // Avança 1 card
          }
        }
      }}
      className="absolute right-0 top-1/2 -translate-y-10 translate-x-14 bg-white border border-gray-200 text-gray-700 hover:text-blue-600 w-12 h-12 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-all z-30 cursor-pointer"
      aria-label="Next slide"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
        </div>
      </div>
    </section>

      </main>
      <Footer />
    </div>
  );
}
