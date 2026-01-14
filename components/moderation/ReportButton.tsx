"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type ReportButtonProps = {
  contentType: 'post' | 'profile_post_comment' | 'event_comment';
  contentId: string;
  onReported?: () => void;
  size?: 'sm' | 'md';
};

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'false_info', label: 'False Information' },
  { value: 'other', label: 'Other' },
];

export default function ReportButton({
  contentType,
  contentId,
  onReported,
  size = 'sm',
}: ReportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createSupabaseBrowser();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!reason) {
      setMessage("Please select a reason");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/moderation/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          reason,
          description: description.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Failed to submit report');
        setSubmitting(false);
        return;
      }

      setMessage('Report submitted successfully');
      setTimeout(() => {
        setShowModal(false);
        setReason('');
        setDescription('');
        setMessage(null);
        if (onReported) onReported();
      }, 1500);
    } catch (error) {
      console.error('Error reporting content:', error);
      setMessage('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`text-slate-400 hover:text-red-600 transition-colors ${
          size === 'sm' ? 'text-xs' : 'text-sm'
        }`}
        title="Report content"
      >
        ⚠️ Report
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Report Content</h3>
            <p className="text-sm text-slate-600">
              Help us keep the community safe by reporting inappropriate content.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-2 block">
                  Reason for reporting
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select a reason...</option>
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 mb-2 block">
                  Additional details (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Provide more context..."
                />
              </div>

              {message && (
                <div
                  className={`text-sm p-2 rounded-lg ${
                    message.includes('success')
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setReason('');
                    setDescription('');
                    setMessage(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reason}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


