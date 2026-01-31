"use client";

import { useState } from "react";
import Image from "next/image";

type PostImagesProps = {
  imageUrl?: string | null;
  imageUrls?: string[] | null;
};

// Helper to detect if URL is a video
function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.ogg'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
}

export default function PostImages({ imageUrl, imageUrls }: PostImagesProps) {
  // Support both old single image_url and new image_urls array
  const media = imageUrls && imageUrls.length > 0 
    ? imageUrls 
    : imageUrl 
      ? [imageUrl] 
      : [];

  const [currentIndex, setCurrentIndex] = useState(0);

  if (media.length === 0) return null;

  const currentMedia = media[currentIndex];
  const hasMultiple = media.length > 1;
  const isVideo = currentMedia ? isVideoUrl(currentMedia) : false;

  return (
    <div className="relative w-full h-full bg-slate-100 group">
      {currentMedia && (
        isVideo ? (
          <video
            src={currentMedia}
            controls
            className="w-full h-full object-contain"
            playsInline
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <Image
            src={currentMedia}
            alt="Post image"
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        )
      )}

      {/* Navigation arrows */}
      {hasMultiple && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100 z-10"
            aria-label="Previous"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev + 1) % media.length);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100 z-10"
            aria-label="Next"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Media counter */}
      {hasMultiple && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
          {currentIndex + 1} / {media.length}
        </div>
      )}

      {/* Dot indicators */}
      {hasMultiple && (
        <div className="absolute bottom-2 right-2 flex gap-1.5">
          {media.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to item ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
