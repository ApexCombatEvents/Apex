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
          {sponsorship.image_url ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={sponsorship.image_url}
                alt={sponsorship.title}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-slate-100 flex flex-col items-center justify-center flex-shrink-0 border border-dashed border-slate-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-slate-400 mb-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div className="text-[8px] text-slate-500 text-center leading-tight px-1">
                64×64px
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {sponsorship.description && (
              <p className="text-xs text-slate-600 line-clamp-2">
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
      <div className="block w-[95%] mx-auto py-2">
        {sponsorship.image_url ? (
          <div className="w-full h-56 md:h-64 rounded-xl overflow-hidden mb-4">
            <Image
              src={sponsorship.image_url}
              alt={sponsorship.title}
              width={600}
              height={256}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-56 md:h-64 rounded-xl bg-slate-100 mb-4 flex flex-col items-center justify-center border border-dashed border-slate-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-slate-400 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div className="text-sm font-medium text-slate-600 mb-1">No image</div>
            <div className="text-xs text-slate-500 text-center px-2">
              800×320px (5:2)
            </div>
          </div>
        )}
        {sponsorship.description && (
          <div className="mb-4">
            <p className="text-base text-slate-600 leading-relaxed">{sponsorship.description}</p>
          </div>
        )}
        {sponsorship.link_url && (
          <a
            href={sponsorship.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full rounded-lg border-2 border-purple-600 bg-purple-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-purple-700 hover:shadow-md"
          >
            {sponsorship.button_text || "Learn More"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-2"
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
          </a>
        )}
      </div>
    );

    return content;
  }

  // Horizontal variant (default)
  const content = (
    <div className={`block card hover:shadow-lg transition-all duration-200 ${
      sponsorship.link_url ? "cursor-pointer" : ""
    }`}>
      <div className="flex items-center gap-4">
        {sponsorship.image_url ? (
          <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
            <Image
              src={sponsorship.image_url}
              alt={sponsorship.title}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-xl bg-slate-100 flex flex-col items-center justify-center flex-shrink-0 border border-dashed border-slate-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-slate-400 mb-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div className="text-[9px] text-slate-500 text-center leading-tight px-1">
              96×96px
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
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
