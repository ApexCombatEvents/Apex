// /components/ProfileHeader.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import React from "react";

export default function ProfileHeader({
  bannerUrl,
  avatarUrl,
  title,
  subtitle,
  stat,
  children,
}: {
  bannerUrl?: string | null;
  avatarUrl?: string | null;
  title: string;
  subtitle?: string;
  stat?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="h-48 w-full bg-purple-100 rounded-b-2xl overflow-hidden">
        {bannerUrl ? (
          <div className="relative w-full h-full">
            <Image
              src={bannerUrl}
              alt="banner"
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-purple-700 px-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 mb-2 opacity-50"
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
            <div className="text-xs font-medium mb-1">No banner image</div>
            <div className="text-[10px] opacity-75 text-center max-w-xs">
              Recommended: 1600×560px (16:9 ratio)
            </div>
          </div>
        )}
      </div>

      <div className="-mt-12 px-6">
        <div className="flex items-end gap-4">
          <div className="h-24 w-24 rounded-2xl overflow-hidden ring-4 ring-white bg-purple-100">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="avatar"
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-purple-700">
                No avatar
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-4 flex-1">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-2xl font-bold text-purple-700">{title}</div>
                {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
              </div>
              <div className="text-sm text-gray-600">{stat}</div>
            </div>
            <div className="mt-3">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
