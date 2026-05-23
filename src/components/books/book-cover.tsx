"use client";

import React from "react";
import Image from "next/image";

interface BookCoverProps {
  title: string;
  coverUrl?: string | null;
  className?: string;
  fill?: boolean;
}

const GRADIENTS = [
  "from-violet-600 to-indigo-950",
  "from-rose-500 to-amber-950",
  "from-emerald-600 to-teal-950",
  "from-fuchsia-600 to-purple-950",
  "from-cyan-500 to-blue-950",
  "from-amber-500 to-red-950",
];

export function BookCover({ title, coverUrl, className = "", fill = true }: BookCoverProps) {
  // Generate initials
  const initials = title
    ? title
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "BK";

  // Deterministic gradient selection based on title string hash
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradient = GRADIENTS[Math.abs(hash) % GRADIENTS.length];

  if (coverUrl) {
    return (
      <Image
        src={coverUrl}
        alt={title}
        fill={fill}
        className={`object-cover ${className}`}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        unoptimized
      />
    );
  }

  return (
    <div
      className={`absolute inset-0 bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-4 text-center select-none ${className}`}
    >
      {/* Luxury border and pattern */}
      <div className="absolute inset-2 border border-white/5 rounded-xl pointer-events-none flex flex-col justify-between p-3">
        <div className="text-[10px] text-white/20 uppercase tracking-widest text-left font-mono">SADBHAWANA</div>
        <div className="text-[10px] text-white/20 uppercase tracking-widest text-right font-mono">EDITION I</div>
      </div>
      
      {/* Subtle grid background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-40 pointer-events-none" />
      
      {/* Initials & title text */}
      <div className="space-y-3 z-10">
        <div className="text-white/80 font-bold tracking-widest text-4xl md:text-5xl font-sans drop-shadow-md">
          {initials}
        </div>
        <div className="text-white/40 text-[10px] tracking-wider uppercase font-mono max-w-[80%] mx-auto truncate">
          {title}
        </div>
      </div>
    </div>
  );
}
