"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CATEGORIES = [
  "All Topics", 
  "Getting Started", 
  "Job Upload", 
  "Interview Questions", 
  "Privacy & Data", 
  "Troubleshooting"
];

const FAQ_ITEMS = [
  // Getting Started
  {
    id: 1,
    category: "Getting Started",
    q: "What is DashFetch?",
    a: "DashFetch is an AI-powered platform that helps you prepare for job interviews by analyzing job descriptions and generating interview questions."
  },
  {
    id: 2,
    category: "Getting Started",
    q: "Who is DashFetch for?",
    a: "DashFetch is designed for students, junior developers, career changers, and professionals preparing for technical interviews."
  },
  {
    id: 3,
    category: "Getting Started",
    q: "Do I need an account to use DashFetch?",
    a: "No. You can start using the application without creating an account."
  },
  {
    id: 4,
    category: "Getting Started",
    q: "How do I get started?",
    a: "Simply paste a job description, start the analysis, and review your personalized interview preparation."
  },
  // Job Upload
  {
    id: 5,
    category: "Job Upload",
    q: "How do I upload a job description?",
    a: "Copy and paste the job description into the input field and start the analysis."
  },
  {
    id: 6,
    category: "Job Upload",
    q: "What types of job descriptions are supported?",
    a: "DashFetch supports most software engineering and technology-related job descriptions."
  },
  {
    id: 7,
    category: "Job Upload",
    q: "Can I upload very long job descriptions?",
    a: "Yes. However, extremely long descriptions may take slightly longer to process."
  },
  {
    id: 8,
    category: "Job Upload",
    q: "What happens after I submit a job description?",
    a: "The AI extracts the main skills, responsibilities, technologies, and qualifications before generating interview questions."
  },
  // Interview Questions
  {
    id: 9,
    category: "Interview Questions",
    q: "How are interview questions generated?",
    a: "Questions are generated based on the skills, technologies, and responsibilities identified in the job description."
  },
  {
    id: 10,
    category: "Interview Questions",
    q: "Why are some questions not written exactly like the job description?",
    a: "The AI also includes common interview questions related to similar roles to provide broader preparation."
  },
  {
    id: 11,
    category: "Interview Questions",
    q: "Can I generate new questions?",
    a: "Yes. You can analyze another job description or regenerate interview content."
  },
  {
    id: 12,
    category: "Interview Questions",
    q: "Are the questions customized?",
    a: "Yes. Every set of questions is tailored to the uploaded job description."
  },
  // Privacy & Data
  {
    id: 13,
    category: "Privacy & Data",
    q: "Does DashFetch store my job descriptions?",
    a: "Job descriptions are only processed to generate interview preparation. Refer to our Privacy Policy for more details."
  },
  {
    id: 14,
    category: "Privacy & Data",
    q: "Is my personal information shared?",
    a: "No. DashFetch does not share your personal information with third parties."
  },
  {
    id: 15,
    category: "Privacy & Data",
    q: "Is my data secure?",
    a: "We follow industry best practices to protect user data during processing."
  },
  // Troubleshooting
  {
    id: 16,
    category: "Troubleshooting",
    q: "Why is my analysis taking longer than expected?",
    a: "Large job descriptions or temporary server load may increase processing time."
  },
  {
    id: 17,
    category: "Troubleshooting",
    q: "What should I do if the analysis fails?",
    a: "Try refreshing the page and submitting the job description again."
  },
  {
    id: 18,
    category: "Troubleshooting",
    q: "Why didn't I receive interview questions?",
    a: "Make sure the job description contains enough information for the AI to analyze."
  },
  {
    id: 19,
    category: "Troubleshooting",
    q: "The page isn't working correctly. What should I do?",
    a: "Refresh the page or try using the latest version of your browser."
  }
];

export default function FAQPage() {
  const [openId, setOpenId] = useState(1);
  const [activeCategory, setActiveCategory] = useState("All Topics");
  const filteredItems = activeCategory === "All Topics" 
    ? FAQ_ITEMS 
    : FAQ_ITEMS.filter(item => item.category === activeCategory);

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-gray-50/50 py-12 px-6">
        <div className="max-w-4xl mx-auto mt-4">
          
          {/* Back to Home button */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-gray-600 font-semibold text-xs hover:bg-gray-50 transition-colors mb-8 shadow-xs bg-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Home
          </Link>

          {/* Header */}
          <div className="text-left mb-8">
            <h1 className="font-display text-3xl font-bold text-gray-800">
              Frequently Asked Questions
            </h1>
            <p className="text-gray-500 text-sm mt-3">
              Find answers to the most common questions about DashFetch
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setOpenId(null); 
                }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                  activeCategory === cat 
                    ? "bg-purple-600 border-purple-600 text-white shadow-xs" 
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Filtered Accordion List */}
          <div className="flex flex-col gap-3">
            {filteredItems.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div 
                  key={item.id}
                  className="bg-white border border-gray-100 rounded-2xl transition-all duration-200 shadow-xs"
                >
                  <button
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="w-full flex items-center justify-between p-5 text-left font-sans font-semibold text-gray-800 hover:text-purple-600 transition-colors focus:outline-none cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold transition-all text-sm ${
                        isOpen ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-600"
                      }`}>
                        {isOpen ? "−" : "+"}
                      </div>
                      <span className="text-sm md:text-base">{item.q}</span>
                    </div>

                    <span className={`text-xl font-light shrink-0 transition-transform hidden sm:inline ${
                      isOpen ? "text-purple-600" : "text-gray-400"
                    }`}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? "max-h-[200px] border-t border-gray-50" : "max-h-0"
                    }`}
                  >
                    <p className="p-5 text-xs md:text-sm text-gray-500 leading-relaxed bg-white rounded-b-2xl">
                      {item.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </main>
      
      <Footer />
    </>
  );
}