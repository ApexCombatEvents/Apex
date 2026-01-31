import Link from "next/link";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabaseServer";
import PostReactions from "@/components/social/PostReactions";
import PostActionsMenu from "@/components/social/PostActionsMenu";
import PostImages from "@/components/social/PostImages";
import PostContent from "@/components/social/PostContent";

type PostRow = {
  id: string;
  profile_id: string;
  content: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  created_at: string;
};

export default async function PostPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServer();

  const { data: post, error } = await supabase
    .from("profile_posts")
    .select("id, profile_id, content, image_url, image_urls, created_at")
    .eq("id", params.id)
    .single<PostRow>();

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="card">
          <p className="text-sm text-slate-700">Post not found.</p>
          <Link
            href="/"
            className="inline-flex mt-3 text-sm font-medium text-purple-700 hover:underline"
          >
            Back to home →
          </Link>
        </div>
      </div>
    );
  }

  const { data: author } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq("id", post.profile_id)
    .maybeSingle();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwnPost = user?.id === post.profile_id;

  const authorName = author?.full_name || author?.username || "Profile";
  const authorUsername = author?.username || null;
  const createdLabel = new Date(post.created_at).toLocaleString();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={authorUsername ? `/profile/${authorUsername}` : "/"}
          className="text-xs text-purple-700 hover:underline"
        >
          ← Back
        </Link>
      </div>

      <section className="card overflow-hidden p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-purple-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
              {author?.avatar_url && (
                <Image
                  src={author.avatar_url}
                  alt={authorName}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {authorUsername ? (
                  <Link
                    href={`/profile/${authorUsername}`}
                    className="hover:underline"
                  >
                    {authorName}
                  </Link>
                ) : (
                  authorName
                )}
              </div>
              <div className="text-[11px] text-slate-500">{createdLabel}</div>
            </div>
          </div>

          {isOwnPost && (
            <div className="relative">
              <PostActionsMenu
                postId={post.id}
                initialContent={post.content}
                initialImageUrl={post.image_url}
                variant="light"
              />
            </div>
          )}
        </div>

        {/* Images */}
        {post.image_url || post.image_urls ? (
          <div className="relative w-full aspect-[4/3] bg-slate-100">
            <PostImages imageUrl={post.image_url} imageUrls={post.image_urls} />
          </div>
        ) : null}

        {/* Content */}
        {post.content && (
          <div className="px-4 py-3">
            <PostContent content={post.content} />
          </div>
        )}

        {/* Reactions + comments */}
        <div className="px-4 pb-4">
          <PostReactions postId={post.id} defaultShowComments />
        </div>
      </section>
    </div>
  );
}


