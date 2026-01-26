"use client";

export default function GlassesLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "w-5 h-5"}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0366D6" />
          <stop offset="100%" stopColor="#1F6FEB" />
        </linearGradient>
      </defs>
      <g>
        <ellipse cx="32" cy="30" rx="14" ry="16" stroke="currentColor" strokeWidth="2" fill="none" />
        <path
          d="M20 20c-3 0-6 2-9 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M44 20c3 0 6 2 9 6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="26" cy="28" r="5" fill="url(#blueGradient)" />
        <circle cx="38" cy="28" r="5" fill="url(#blueGradient)" />
        <circle cx="26" cy="28" r="2" fill="currentColor" />
        <circle cx="38" cy="28" r="2" fill="currentColor" />
        <circle cx="27" cy="26" r="1" fill="url(#blueGradient)" />
        <circle cx="37" cy="26" r="1" fill="url(#blueGradient)" />
        <path
          d="M32 44v4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M24 44v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M40 44v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}