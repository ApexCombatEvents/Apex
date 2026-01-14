// components/profiles/CoachProfile.tsx
"use client";

import FighterProfile from "./FighterProfile";

type Post = {
  id: string;
  content?: string | null;
  created_at: string;
  image_url?: string | null;
};

export default function CoachProfile({ 
  profile, 
  posts = [],
  isOwnProfile = false 
}: { 
  profile: any;
  posts?: Post[];
  isOwnProfile?: boolean;
}) {
  // Get coach visibility settings from social_links
  const socialLinks = profile?.social_links || {};
  const hideStats = socialLinks.hide_stats ?? false;
  const hideFights = socialLinks.hide_fights ?? false;

  return (
    <FighterProfile 
      profile={profile} 
      posts={posts} 
      isOwnProfile={isOwnProfile}
      hideStats={hideStats}
      hideFights={hideFights}
    />
  );
}

