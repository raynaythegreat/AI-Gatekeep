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
        <linearGradient id="athenaGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD54D" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
      </defs>
      
      <rect
        width="64"
        height="64"
        rx="8"
        fill="#0A0A0A"
      />
      
      <g>
        <path
          d="M20 56 L20 50 C20 42 22 36 26 32 C28 30 30 28 32 28 C34 28 36 30 38 32 C42 36 44 42 44 50 L44 56"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M20 56 L24 58 L28 56 M44 56 L40 58 L36 56"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M32 8 L28 10 L26 14 L28 18 L32 20 L36 18 L38 14 L36 10 Z"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M26 14 L28 10 L24 8 L20 10 L18 14 L18 18 L22 20 L24 18"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M38 14 L36 10 L40 8 L44 10 L46 14 L46 18 L42 20 L40 18"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <circle
          cx="32"
          cy="28"
          r="4"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="1.5"
          fill="none"
        />
        
        <path
          d="M28 32 L32 36 L36 32"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M32 36 L32 42"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
        
        <circle
          cx="26"
          cy="16"
          r="1.5"
          fill="url(#athenaGoldGradient)"
        />
        
        <circle
          cx="38"
          cy="16"
          r="1.5"
          fill="url(#athenaGoldGradient)"
        />
      </g>
    </svg>
  );
}