"use client";

export default function AthenaLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "w-5 h-5"}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Golden Apple Logo */}
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
      </defs>
      
      {/* Apple Shape */}
      <ellipse cx="32" cy="32" rx="18" ry="20" fill="url(#goldGradient)" />
      
      {/* Apple Indent (top) */}
      <ellipse cx="32" cy="20" rx="8" ry="10" fill="white" />
      
      {/* Stem */}
      <path d="M32 10 Q34 14 32 16 Q30 14 32 10" stroke="#8B6914" strokeWidth="1.5" fill="#8B6914" />
      
      {/* Leaf */}
      <path d="M32 10 Q38 6 42 10 Q38 12 32 10" fill="#228B22" />
    </svg>
  );
}