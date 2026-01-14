import React from "react";

export default function ApexLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Apex text with gradient */}
      <div className="text-2xl font-extrabold leading-tight">
        <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
          Apex
        </span>
      </div>
      {/* Combat Events text with gradient */}
      <div className="text-xs font-semibold uppercase tracking-wider leading-tight text-center">
        <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
          Combat Events
        </span>
      </div>
    </div>
  );
}
