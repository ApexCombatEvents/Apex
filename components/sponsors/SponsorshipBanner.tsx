"use client";

import Link from "next/link";
import Image from "next/image";

type Sponsorship = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  button_text?: string | null;
  background_color?: string | null;
  text_color?: string | null;
};

type SponsorshipBannerProps = {
  sponsorship: Sponsorship;
  variant?: "horizontal" | "vertical" | "compact";
};

export default function SponsorshipBanner({
  sponsorship,
  variant = "horizontal",
}: SponsorshipBannerProps) {
  if (variant === "compact") {
    const content = (
      <div className={`block card-compact hover:shadow-md transition-all duration-200 ${
        sponsorship.link_url ? "cursor-pointer" : ""
      }`}>
        <div className="flex items-center gap-3">
          {sponsorship.image_url && (
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={sponsorship.image_url}
                alt={sponsorship.title}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{sponsorship.title}</h3>
            {sponsorship.description && (
              <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                {sponsorship.description}
              </p>
            )}
          </div>
          {sponsorship.link_url && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-purple-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </div>
      </div>
    );

    return sponsorship.link_url ? (
      <Link
        href={sponsorship.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </Link>
    ) : (
      content
    );
  }

  if (variant === "vertical") {
    const content = (
      <div className={`block card hover:shadow-lg transition-all duration-200 ${
        sponsorship.link_url ? "cursor-pointer" : ""
      }`}>
        {sponsorship.image_url && (
          <div className="w-full h-32 rounded-xl overflow-hidden mb-3">
            <Image
              src={sponsorship.image_url}
              alt={sponsorship.title}
              width={400}
              height={128}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <h3 className="font-bold text-lg text-slate-900 mb-2">{sponsorship.title}</h3>
        {sponsorship.description && (
          <p className="text-sm text-slate-600 mb-3">{sponsorship.description}</p>
        )}
        {sponsorship.button_text && (
          <span className="inline-flex items-center text-sm font-semibold text-purple-700">
            {sponsorship.button_text}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        )}
      </div>
    );

    return sponsorship.link_url ? (
      <Link
        href={sponsorship.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </Link>
    ) : (
      content
    );
  }

  // Horizontal variant (default)
  const content = (
    <div className={`block card hover:shadow-lg transition-all duration-200 ${
      sponsorship.link_url ? "cursor-pointer" : ""
    }`}>
      <div className="flex items-center gap-4">
        {sponsorship.image_url && (
          <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
            <Image
              src={sponsorship.image_url}
              alt={sponsorship.title}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-slate-900 mb-1">{sponsorship.title}</h3>
          {sponsorship.description && (
            <p className="text-sm text-slate-600 mb-2">{sponsorship.description}</p>
          )}
          {sponsorship.button_text && (
            <span className="inline-flex items-center text-sm font-semibold text-purple-700">
              {sponsorship.button_text}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return sponsorship.link_url ? (
    <Link
      href={sponsorship.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      {content}
    </Link>
  ) : (
    content
  );
}
