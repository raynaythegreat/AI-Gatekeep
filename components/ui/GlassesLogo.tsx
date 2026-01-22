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
          <stop offset="50%" stopColor="#FFD54D" />
          <stop offset="100%" stopColor="#FFC107" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#glow)">
        <ellipse cx="20" cy="32" rx="10" ry="12" stroke="url(#goldGradient)" strokeWidth="3" fill="none" />
        <ellipse cx="44" cy="32" rx="10" ry="12" stroke="url(#goldGradient)" strokeWidth="3" fill="none" />
        <circle cx="20" cy="32" r="5" fill="url(#goldGradient)" />
        <circle cx="44" cy="32" r="5" fill="url(#goldGradient)" />
        <circle cx="20" cy="32" r="2" fill="#1a1a1a" />
        <circle cx="44" cy="32" r="2" fill="#1a1a1a" />
        <circle cx="21" cy="30" r="1" fill="url(#goldGradient)" opacity="0.8" />
        <circle cx="43" cy="30" r="1" fill="url(#goldGradient)" opacity="0.8" />
      </g>
      <path
        d="M20 44v8"
        stroke="url(#goldGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M44 44v8"
        stroke="url(#goldGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M12 20c0-4 4-8 8-8 8"
        stroke="url(#goldGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M52 20c0-4-4-8-8-8 8"
        stroke="url(#goldGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M16 16l-6-2"
        stroke="url(#goldGradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M48 16l6-2"
        stroke="url(#goldGradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="20" cy="24" rx="3" ry="2" stroke="url(#goldGradient)" strokeWidth="1.5" fill="none" />
      <ellipse cx="44" cy="24" rx="3" ry="2" stroke="url(#goldGradient)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
