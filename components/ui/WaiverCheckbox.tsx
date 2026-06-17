// components/ui/WaiverCheckbox.tsx
"use client";

export type WaiverType = "signup" | "event-creation" | "bout-acceptance";

const WAIVER_LABELS: Record<WaiverType, string> = {
  "signup":
    "I confirm I am 18 years of age or older, that all information I provide is truthful and accurate, and I accept full personal responsibility for my participation on this platform. I have read and agree to the Platform Participation Agreement.",
  "event-creation":
    "I understand that as the event organiser I assume full legal responsibility for this event. The platform is not liable for any injury, incident, regulatory non-compliance, or dispute arising from or connected to this event. I have read and agree to the Event Organiser Liability Waiver.",
  "bout-acceptance":
    "I acknowledge that by accepting this bout I confirm this is a valid match-up to the best of my knowledge. The platform is not liable for any injury, harm, or dispute arising from this bout. I have read and agree to the Bout Acceptance Agreement.",
};

type Props = {
  type: WaiverType;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export default function WaiverCheckbox({ type, checked, onChange, disabled }: Props) {
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
          {WAIVER_LABELS[type]}
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
