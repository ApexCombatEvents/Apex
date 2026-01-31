"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

type EventSponsorship = {
  id: string;
  image_url: string;
  link_url?: string | null;
  display_order?: number | null;
};

type EventSponsorshipSlideshowProps = {
  sponsorships: EventSponsorship[];
  autoRotateInterval?: number; // in milliseconds, default 5000
};

export default function EventSponsorshipSlideshow({
  sponsorships,
  autoRotateInterval = 5000,
}: EventSponsorshipSlideshowProps) {
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
    return null;
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

  const content = (
    <div className="relative w-full h-full flex items-center justify-center bg-white rounded-xl overflow-hidden">
      <Image
        src={currentSponsorship.image_url}
        alt="Event sponsor"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 400px"
        priority={currentIndex === 0}
      />
    </div>
  );

  return (
    <div
      className="relative w-full h-full rounded-xl border border-slate-200 bg-white overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
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
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Previous sponsorship"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mx-auto"
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
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Next sponsorship"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mx-auto"
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
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {sponsorships.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDotClick(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-purple-600 w-6"
                  : "bg-slate-300 w-2 hover:bg-slate-400"
              }`}
              aria-label={`Go to sponsorship ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

