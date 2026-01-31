"use client";

import Link from "next/link";

type PostContentProps = {
  content: string;
  className?: string;
  truncate?: boolean;
};

// Function to detect URLs and convert them to clickable links
function renderContentWithLinks(content: string, linkClassName: string): React.ReactNode {
  // URL regex pattern - matches http, https, and localhost URLs
  const urlRegex = /(https?:\/\/[^\s]+|localhost:\d+[^\s]*)/gi;
  
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(content)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    // Add the URL as a link
    const url = match[0];
    const displayUrl = url.length > 50 ? url.substring(0, 50) + "..." : url;
    
    parts.push(
      <Link
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {displayUrl}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  // If no URLs found, return original content
  if (parts.length === 0) {
    return content;
  }

  return <>{parts}</>;
}

export default function PostContent({ content, className = "", truncate }: PostContentProps) {
  const baseClasses = truncate 
    ? "text-xs font-medium mb-1 line-clamp-2"
    : "text-sm text-slate-800 whitespace-pre-wrap break-words";
  
  // Determine if we're in a white text context (overlay)
  const isWhiteText = className.includes("text-white");
  const linkClass = isWhiteText 
    ? "text-white/90 hover:text-white underline"
    : "text-purple-600 hover:text-purple-700 hover:underline break-all";
  
  return (
    <p className={`${baseClasses} ${className}`}>
      {renderContentWithLinks(content, linkClass)}
    </p>
  );
}
