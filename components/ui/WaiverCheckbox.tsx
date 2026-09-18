// components/ui/WaiverCheckbox.tsx
"use client";

export type WaiverType = "signup" | "event-creation" | "bout-acceptance";

const WAIVER_LABELS: Record<WaiverType, string> = {
  "signup":
    "I confirm that all information I provide is truthful and accurate, including my date of birth, and I accept full personal responsibility for my participation on this platform. I have read and agree to the Platform Participation Agreement.",
  "event-creation":
    "I understand that as the event organiser I assume full legal responsibility for this event. The platform is not liable for any injury, incident, regulatory non-compliance, or dispute arising from or connected to this event. I have read and agree to the Event Organiser Liability Waiver.",
  "bout-acceptance":
    "I acknowledge that by accepting this bout I confirm this is a valid match-up to the best of my knowledge. The platform is not liable for any injury, harm, or dispute arising from this bout. I have read and agree to the Bout Acceptance Agreement.",
};

// Shown instead of the standard signup label when the applicant is under 18.
// The adult wording has them accepting full personal responsibility, which a
// minor cannot give — their guardian accepts on their behalf instead.
const MINOR_SIGNUP_LABEL =
  "I confirm that all information I provide is truthful and accurate, including my date of birth, and that my parent or guardian has agreed to the Platform Participation Agreement on my behalf. I understand my account stays restricted until they confirm.";

type Props = {
  type: WaiverType;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Use the under-18 wording. Only affects the signup waiver. */
  minor?: boolean;
};

export default function WaiverCheckbox({ type, checked, onChange, disabled, minor }: Props) {
  const label = minor && type === "signup" ? MINOR_SIGNUP_LABEL : WAIVER_LABELS[type];
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
      <div className="flex items-start gap-2">
        <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
          ⚠ Liability Waiver
        </span>
      </div>
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-purple-600 cursor-pointer"
        />
        <span className="text-xs text-slate-700 leading-relaxed group-hover:text-slate-900">
          {label}
        </span>
      </label>
      <div className="ml-7">
        <a
          href={`/waiver/${type}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-purple-600 hover:text-purple-800 hover:underline"
        >
          Read the full waiver →
        </a>
      </div>
    </div>
  );
}
