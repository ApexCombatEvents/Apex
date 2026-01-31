"use client";

import { useState, useEffect } from "react";
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
  display_order?: number | null;
};

type SponsorshipSlideshowProps = {
  sponsorships: Sponsorship[];
  autoRotateInterval?: number; // in milliseconds, default 5000
};

export default function SponsorshipSlideshow({
  sponsorships,
  autoRotateInterval = 5000,
}: SponsorshipSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate slideshow
  useEffect(() => {
    if (sponsorships.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sponsorships.length);
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [sponsorships.length, autoRotateInterval, isPaused]);

  if (sponsorships.length === 0) {
    // Fallback to default welcome message if no sponsorships
    return (
      <div className="w-full h-64 md:h-80 lg:h-96 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 flex items-center justify-center text-white font-bold text-xl sm:text-2xl text-center px-6 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="relative z-10">
          <p className="mb-2">Matchmaking</p>
          <p className="mb-2">Rankings</p>
          <p>Fight Management</p>
          <p className="text-lg font-normal mt-4 opacity-90">All in one place</p>
        </div>
      </div>
    );
  }

  const currentSponsorship = sponsorships[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + sponsorships.length) % sponsorships.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % sponsorships.length);
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  const bgColor = currentSponsorship.background_color || "from-purple-600 via-indigo-600 to-purple-800";
  const textColor = currentSponsorship.text_color || "text-white";

  const content = (
    <div className={`relative z-10 h-full flex flex-col items-center justify-center text-center px-6 ${textColor} ${currentSponsorship.link_url ? "cursor-pointer hover:opacity-95 transition-opacity" : ""}`}>
      {currentSponsorship.description && (
        <p className="text-base sm:text-lg md:text-xl mb-4 max-w-2xl drop-shadow-md opacity-95">
          {currentSponsorship.description}
        </p>
      )}
      {currentSponsorship.button_text && (
        <span className="inline-flex items-center text-base sm:text-lg md:text-xl font-semibold drop-shadow-md">
          {currentSponsorship.button_text}
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
        </span>
      )}
    </div>
  );

  return (
    <div
      className="relative w-full h-64 md:h-80 lg:h-96 rounded-2xl shadow-2xl overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Image or Gradient */}
      {currentSponsorship.image_url ? (
        <div className="absolute inset-0">
          <Image
            src={currentSponsorship.image_url}
            alt={currentSponsorship.title}
            fill
            className="object-cover"
            priority={currentIndex === 0}
          />
          {/* No overlay - let the photo brightness show through naturally */}
        </div>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${bgColor}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        </div>
      )}

      {/* Content */}
      {currentSponsorship.link_url ? (
        <Link
          href={currentSponsorship.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-full"
        >
          {content}
        </Link>
      ) : (
        content
      )}

      {/* Navigation Arrows */}
      {sponsorships.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlePrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Previous sponsorship"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Next sponsorship"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mx-auto"
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
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {sponsorships.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {sponsorships.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDotClick(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to sponsorship ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
