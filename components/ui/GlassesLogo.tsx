"use client";

interface GlassesLogoProps {
  className?: string;
}

export default function GlassesLogo({ className }: GlassesLogoProps) {
  return (
    <svg
      className={className ?? "w-5 h-5"}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFC107" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
      </defs>
      <g>
        <ellipse cx="32" cy="30" rx="18" ry="14" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="24" cy="28" r="6" fill="url(#goldGradient)" />
        <circle cx="40" cy="28" r="6" fill="url(#goldGradient)" />
        <circle cx="24" cy="28" r="2.5" fill="currentColor" />
        <circle cx="40" cy="28" r="2.5" fill="currentColor" />
        <circle cx="25" cy="26" r="1" fill="url(#goldGradient)" />
        <circle cx="39" cy="26" r="1" fill="url(#goldGradient)" />
        <path
          d="M32 44v6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M14 12c0-2 4-6 10-6 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M50 12c0-2-4-6-10-6-10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
