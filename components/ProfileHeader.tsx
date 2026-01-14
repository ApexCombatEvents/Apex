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
          <div className="w-full h-full flex items-center justify-center text-purple-700">No banner</div>
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
