"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { 
    href: "/job-summary", 
    label: "Job Summary",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    )
  },
  { 
    href: "/interview-questions", 
    label: "Interview Questions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 7 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/>
        <line x1="9" y1="18" x2="15" y2="18"/>
        <line x1="10" y1="22" x2="14" y2="22"/>
      </svg>
    )
  },
  { 
    href: "/mock-interview", 
    label: "Mock Interview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
      </svg>
    )
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  
  return (
    <nav aria-label="Main navigation" className="md:w-64 md:shrink-0 md:border-r md:border-gray-100 md:min-h-screen md:py-8 md:px-4 border-b border-gray-100 px-4 py-3 md:flex md:flex-col bg-white">
      
      <Link href="/" className="hidden md:flex items-center gap-2.5 mb-8 focus-ring rounded p-2">
        <Image 
          src="/logo.DashFetch.png" 
          alt="DashFetch Logo"
          width={28}               
          height={28}
          className="object-contain"
        />
        <span className="text-[#131E49] font-display font-bold text-xl tracking-tight">
          DashFetch
        </span>
      </Link>

      {/* Navigation Menu */}
      <ul className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold transition-all focus-ring ${
                  isActive 
                    ? "bg-[#EFF6FF] text-[#2563EB]" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className={isActive ? "text-[#2563EB]" : "text-gray-400 group-hover:text-gray-600"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

{/* Bottom New Analysis Button */}
      <div className="hidden md:block mt-auto pt-6">
        <Link 
          href="/" 
          className="flex items-center justify-center gap-2 w-full text-center rounded-xl border-2 border-[#2563EB] px-4 py-3 text-sm font-bold text-[#2563EB] hover:bg-blue-50 transition-colors focus-ring"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#2563EB]">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          New Analysis
        </Link>
      </div>

    </nav>
  );
}