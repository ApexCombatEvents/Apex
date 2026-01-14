import React from "react";

export default function ALogo({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="aLogoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* Outer A shape */}
      <path
        d="M50 10 L20 90 L35 90 L45 65 L55 65 L65 90 L80 90 L50 10 Z"
        fill="url(#aLogoGradient)"
      />
      {/* Inner crossbar */}
      <path
        d="M40 50 L60 50 L58 45 L42 45 Z"
        fill="white"
        opacity="0.9"
      />
      {/* Inner highlight/negative space for depth */}
      <path
        d="M50 10 L30 75 L40 75 L50 40 L60 75 L70 75 L50 10 Z"
        fill="white"
        opacity="0.15"
      />
    </svg>
  );
}
