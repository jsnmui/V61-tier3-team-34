"use client";
import Link from "next/link";
import Image from 'next/image';
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 focus-ring rounded">
        <Image 
          src="/logo.DashFetch.png" 
          alt="Logo Ícone"
          width={24}               
          height={24}
          className="object-contain"
        />
        <span className="text-[#131E49] font-display font-bold text-xl tracking-tight">
            DashFetch
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link href="/#faq" className="hover:text-blue transition-colors focus-ring rounded">FAQ</Link>
          <Link href="/#contact" className="hover:text-blue transition-colors focus-ring rounded">Contact</Link>
          <Link href="/#about" className="hover:text-blue transition-colors focus-ring rounded">About</Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus-ring"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-5 h-0.5 bg-gray-600 mb-1" />
          <div className="w-5 h-0.5 bg-gray-600 mb-1" />
          <div className="w-5 h-0.5 bg-gray-600" />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-4 text-sm font-medium text-gray-600">
          <Link href="/#faq" onClick={() => setMenuOpen(false)} className="hover:text-blue">FAQ</Link>
          <Link href="/#contact" onClick={() => setMenuOpen(false)} className="hover:text-blue">Contact</Link>
          <Link href="/#about" onClick={() => setMenuOpen(false)} className="hover:text-blue">About</Link>
        </nav>
      )}
    </header>
  );
}
