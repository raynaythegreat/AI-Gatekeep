"use client";

export default function AthenaLogo({ className }: { className?: string }) {
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

      {/* Minimal Serif Letter A */}
      {/* Left leg of A */}
      <path
        d="M18 52 L26 16 L32 16 L24 52 Z"
        fill="url(#blueGradient)"
      />

      {/* Right leg of A */}
      <path
        d="M32 52 L38 16 L46 16 L32 52 Z"
        fill="url(#blueGradient)"
      />

      {/* Crossbar of A with serif details */}
      <path
        d="M22 36 L42 36 L42 34 L22 34 Z"
        fill="url(#blueGradient)"
      />

      {/* Top serif - left */}
      <path
        d="M24 16 L20 12 L28 12 L28 16 Z"
        fill="url(#blueGradient)"
      />

      {/* Top serif - right */}
      <path
        d="M40 16 L36 12 L44 12 L44 16 Z"
        fill="url(#blueGradient)"
      />

      {/* Bottom serif - left */}
      <path
        d="M24 52 L18 56 L22 56 L26 52 Z"
        fill="url(#blueGradient)"
      />

      {/* Bottom serif - right */}
      <path
        d="M38 52 L34 56 L42 56 L46 52 Z"
        fill="url(#blueGradient)"
      />
    </svg>
  );
}
