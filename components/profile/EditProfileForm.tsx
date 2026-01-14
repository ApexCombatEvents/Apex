// components/profile/EditProfileForm.tsx
"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Role = "fighter" | "coach" | "gym" | "promotion" | "";

import { COUNTRIES } from "@/lib/countries";

export default function EditProfileForm() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [martialArts, setMartialArts] = useState("");

  // Gym username (used to link fighter/coach to gym profile)
  const [gymUsername, setGymUsername] = useState("");

  // Social links
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  // Multiple website links: array of {name: string, url: string}
  const [websites, setWebsites] = useState<Array<{ name: string; url: string }>>([]);

  // Fighter / coach stats
  const [rank, setRank] = useState("");
  const [record, setRecord] = useState(""); // e.g. "10-2-1"
  const [age, setAge] = useState("");

  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [heightCm, setHeightCm] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");

  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [weight, setWeight] = useState("");

  const isFighterOrCoach = role === "fighter" || role === "coach";

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? "");
        setUsername(profile.username ?? "");
        setRole((profile.role as Role) ?? "");
        setCountry(profile.country ?? "");
        setBio(profile.bio ?? "");
        setMartialArts(profile.martial_arts?.join(", ") ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
        setBannerUrl(profile.banner_url ?? null);

        const social = profile.social_links || {};
        setInstagram(social.instagram ?? "");
        setTwitter(social.twitter ?? "");
        setFacebook(social.facebook ?? "");
        setTiktok(social.tiktok ?? "");
        setYoutube(social.youtube ?? "");
        setGymUsername(social.gym_username ?? "");
        
        // Handle websites - support both old format (single website) and new format (array)
        if (social.websites && Array.isArray(social.websites)) {
          setWebsites(social.websites);
        } else if (social.website) {
          // Migrate old single website to new format
          setWebsites([{ name: "Website", url: social.website }]);
        } else {
          setWebsites([]);
        }

        // Stats fields – these assume matching columns exist in profiles
        setRank(profile.rank ?? "");
        setRecord(profile.record ?? "");
        setAge(profile.age ? String(profile.age) : "");

        setHeightUnit((profile.height_unit as "cm" | "ft") || "cm");
        setHeightCm(profile.height_cm ? String(profile.height_cm) : "");
        setHeightFeet(profile.height_feet ? String(profile.height_feet) : "");
        setHeightInches(
          profile.height_inches ? String(profile.height_inches) : ""
        );

        setWeightUnit((profile.weight_unit as "kg" | "lb") || "kg");
        setWeight(profile.weight ? String(profile.weight) : "");
      }

      setLoading(false);
    })();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setMessage("You must be signed in.");
      setSaving(false);
      return;
    }

    const martialArtsArray = martialArts
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    // Basic validation for stats
    if (record && !/^\d{1,3}-\d{1,3}-\d{1,3}$/.test(record)) {
      setMessage("Record must be in the format 10-2-1 (wins-losses-draws).");
      setSaving(false);
      return;
    }

    const ageInt =
      age.trim() === "" ? null : Math.max(0, parseInt(age, 10) || 0);

    const weightNum =
      weight.trim() === "" ? null : Math.max(0, parseFloat(weight) || 0);

    let heightCmNum: number | null = null;
    let heightFeetInt: number | null = null;
    let heightInchesInt: number | null = null;

    if (heightUnit === "cm") {
      heightCmNum =
        heightCm.trim() === "" ? null : Math.max(0, parseFloat(heightCm) || 0);
      heightFeetInt = null;
      heightInchesInt = null;
    } else {
      heightFeetInt =
        heightFeet.trim() === ""
          ? null
          : Math.max(0, parseInt(heightFeet, 10) || 0);
      heightInchesInt =
        heightInches.trim() === ""
          ? null
          : Math.max(0, parseInt(heightInches, 10) || 0);
      heightCmNum = null;
    }

    // Helper function to format URLs
    const formatUrl = (url: string): string | null => {
      if (!url || !url.trim()) return null;
      const trimmed = url.trim();
      // If it already starts with http:// or https://, return as is
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
      // If it starts with @, it's a handle - convert to full URL for social media
      if (trimmed.startsWith("@")) {
        return trimmed; // Keep as handle for now, will be formatted on display
      }
      // Otherwise, add https://
      return `https://${trimmed}`;
    };

    const social_links = {
      instagram: formatUrl(instagram),
      twitter: formatUrl(twitter),
      facebook: formatUrl(facebook),
      tiktok: formatUrl(tiktok),
      youtube: formatUrl(youtube),
      websites: websites.filter(w => w.name.trim() && w.url.trim()).map(w => ({
        name: w.name.trim(),
        url: formatUrl(w.url) || w.url.trim(),
      })),
      gym_username: gymUsername || null,
    };

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        username: username || null,
        role: role || null,
        country: country || null,
        bio: bio || null,
        martial_arts: martialArtsArray.length ? martialArtsArray : null,
        social_links,
        // stats
        rank: rank || null,
        record: record || null,
        age: ageInt,
        height_unit: heightUnit,
        height_cm: heightCmNum,
        height_feet: heightFeetInt,
        height_inches: heightInchesInt,
        weight_unit: weightUnit,
        weight: weightNum,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Profile updated.");
      router.refresh();
    }

    setSaving(false);
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatars" | "banners"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;
    if (userError || !user) {
      setMessage("You must be signed in.");
      return;
    }

    const bucket = type === "avatars" ? "avatars" : "banners";
    const filePath = `${user.id}/${Date.now()}-${file.name}`;

    if (type === "avatars") setUploadingAvatar(true);
    else setUploadingBanner(true);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setMessage(uploadError.message);
      if (type === "avatars") setUploadingAvatar(false);
      else setUploadingBanner(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const update =
      type === "avatars"
        ? { avatar_url: publicUrl }
        : { banner_url: publicUrl };

    const { error: updateError } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id);

    if (updateError) {
      setMessage(updateError.message);
    } else {
      if (type === "avatars") setAvatarUrl(publicUrl);
      else setBannerUrl(publicUrl);
      setMessage("Profile updated.");
      router.refresh();
    }

    if (type === "avatars") setUploadingAvatar(false);
    else setUploadingBanner(false);
  }

  if (loading) {
    return null;
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-between"
      >
        <span>Edit Profile</span>
        <span className="text-lg">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
          {/* Profile images */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Profile images</h2>
            <p className="text-xs text-slate-600">
              Upload a profile picture and banner. On mobile this will let you
              choose from your camera roll or take a new photo.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Avatar */}
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-slate-200 overflow-hidden">
                  {avatarUrl && (
                    <Image
                      src={avatarUrl}
                      alt="Profile picture"
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-600">Profile picture</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "avatars")}
                    disabled={uploadingAvatar}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Banner */}
              <div className="flex flex-col gap-2">
                <span className="text-xs text-slate-600">Banner image</span>
                <div className="h-16 rounded-xl bg-slate-200 overflow-hidden">
                  {bannerUrl && (
                    <Image
                      src={bannerUrl}
                      alt="Banner image"
                      width={600}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "banners")}
                  disabled={uploadingBanner}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic info */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Basic info</h2>

              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-xs text-slate-600 space-y-1">
                  Full name / gym / promotion name
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>

                <label className="text-xs text-slate-600 space-y-1">
                  Username (profile handle)
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. gymftdf"
                  />
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-xs text-slate-600 space-y-1">
                  {isFighterOrCoach ? "Country" : "Country / location"}
                  {isFighterOrCoach ? (
                    <select
                      className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      <option value="">Select country…</option>
                      {COUNTRIES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. London, UK"
                    />
                  )}
                </label>
              </div>

              <label className="text-xs text-slate-600 space-y-1 block">
                Gym username (optional)
                <input
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={gymUsername}
                  onChange={(e) => setGymUsername(e.target.value)}
                  placeholder="@yourgymusername"
                />
              </label>

              <label className="text-xs text-slate-600 space-y-1 block">
                Bio
                <textarea
                  className="w-full rounded-xl border px-3 py-2 text-sm min-h-[80px]"
                  maxLength={400}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Short description (we can enforce character limits later to match your sketches)."
                />
              </label>
            </div>

            {/* Martial arts */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Martial arts</h2>
              <label className="text-xs text-slate-600 space-y-1 block">
                Martial arts (comma separated)
                <input
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={martialArts}
                  onChange={(e) => setMartialArts(e.target.value)}
                  placeholder="Muay Thai, Boxing, MMA"
                />
              </label>
            </div>

            {/* Fighter / coach stats */}
            {isFighterOrCoach && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Stats</h2>

                <div className="grid md:grid-cols-3 gap-3">
                  <label className="text-xs text-slate-600 space-y-1">
                    Rank
                    <input
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={rank}
                      onChange={(e) => setRank(e.target.value)}
                      placeholder="e.g. A-class"
                    />
                  </label>

                  <label className="text-xs text-slate-600 space-y-1">
                    Record (wins-losses-draws)
                    <input
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={record}
                      onChange={(e) => setRecord(e.target.value)}
                      placeholder="e.g. 10-2-1"
                    />
                  </label>

                  <label className="text-xs text-slate-600 space-y-1">
                    Age
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 27"
                    />
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {/* Height */}
                  <div className="space-y-1 text-xs text-slate-600">
                    <span>Height</span>
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-xl border px-2 py-1 text-xs bg-white"
                        value={heightUnit}
                        onChange={(e) =>
                          setHeightUnit(e.target.value as "cm" | "ft")
                        }
                      >
                        <option value="cm">cm</option>
                        <option value="ft">ft + in</option>
                      </select>

                      {heightUnit === "cm" ? (
                        <input
                          type="number"
                          min={0}
                          className="w-full rounded-xl border px-3 py-2 text-sm"
                          value={heightCm}
                          onChange={(e) => setHeightCm(e.target.value)}
                          placeholder="e.g. 175"
                        />
                      ) : (
                        <div className="flex gap-2 w-full">
                          <input
                            type="number"
                            min={0}
                            className="w-1/2 rounded-xl border px-3 py-2 text-sm"
                            value={heightFeet}
                            onChange={(e) => setHeightFeet(e.target.value)}
                            placeholder="ft"
                          />
                          <input
                            type="number"
                            min={0}
                            className="w-1/2 rounded-xl border px-3 py-2 text-sm"
                            value={heightInches}
                            onChange={(e) => setHeightInches(e.target.value)}
                            placeholder="in"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="space-y-1 text-xs text-slate-600">
                    <span>Weight</span>
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-xl border px-2 py-1 text-xs bg-white"
                        value={weightUnit}
                        onChange={(e) =>
                          setWeightUnit(e.target.value as "kg" | "lb")
                        }
                      >
                        <option value="kg">kg</option>
                        <option value="lb">lb</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="e.g. 64"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Social links */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Social media links</h2>
              <div className="grid md:grid-cols-2 gap-3">
                <SocialInput
                  label="Instagram"
                  placeholder="@yourhandle or full URL"
                  value={instagram}
                  onChange={setInstagram}
                />
                <SocialInput
                  label="Twitter / X"
                  placeholder="@yourhandle or full URL"
                  value={twitter}
                  onChange={setTwitter}
                />
                <SocialInput
                  label="Facebook"
                  placeholder="Full URL"
                  value={facebook}
                  onChange={setFacebook}
                />
                <SocialInput 
                  label="TikTok" 
                  placeholder="@yourhandle or full URL"
                  value={tiktok} 
                  onChange={setTiktok} 
                />
                <SocialInput
                  label="YouTube"
                  placeholder="@yourhandle or full URL"
                  value={youtube}
                  onChange={setYoutube}
                />
              </div>
              
              {/* Multiple website links */}
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-700">Website links</h3>
                  <button
                    type="button"
                    onClick={() => setWebsites([...websites, { name: "", url: "" }])}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    + Add link
                  </button>
                </div>
                {websites.map((website, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Link name (e.g., Tickets)"
                      value={website.name}
                      onChange={(e) => {
                        const newWebsites = [...websites];
                        newWebsites[index].name = e.target.value;
                        setWebsites(newWebsites);
                      }}
                      className="flex-1 rounded-xl border px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="URL"
                      value={website.url}
                      onChange={(e) => {
                        const newWebsites = [...websites];
                        newWebsites[index].url = e.target.value;
                        setWebsites(newWebsites);
                      }}
                      className="flex-1 rounded-xl border px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setWebsites(websites.filter((_, i) => i !== index))}
                      className="px-3 py-2 text-slate-500 hover:text-red-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
                {websites.length === 0 && (
                  <p className="text-xs text-slate-500">No website links added yet.</p>
                )}
              </div>
            </div>

            {message && (
              <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 whitespace-pre-line">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function SocialInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-xs text-slate-600 space-y-1 block">
      {label}
      <input
        className="w-full rounded-xl border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

