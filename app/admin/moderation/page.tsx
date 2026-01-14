"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Report = {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  reporter: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  reviewer: {
    id: string;
    username: string | null;
    full_name: string | null;
  } | null;
};

type ContentItem = {
  id: string;
  body?: string | null;
  content?: string | null;
  author_profile_id?: string | null;
  moderation_status?: string | null;
};

export default function ModerationDashboard() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [contentItems, setContentItems] = useState<Record<string, ContentItem>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadReports();
    }
  }, [statusFilter, isAdmin]);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role?.toLowerCase() !== "admin") {
      router.push("/");
      return;
    }

    setIsAdmin(true);
  }

  async function loadReports() {
    setLoading(true);
    try {
      const response = await fetch(`/api/moderation/reports?status=${statusFilter}`);
      const data = await response.json();

      if (response.ok) {
        setReports(data.reports || []);

        // Load content items
        const contentMap: Record<string, ContentItem> = {};
        for (const report of data.reports || []) {
          if (!contentMap[`${report.content_type}:${report.content_id}`]) {
            let tableName = "";
            if (report.content_type === "post") {
              tableName = "posts";
            } else if (report.content_type === "profile_post_comment") {
              tableName = "profile_post_comments";
            } else if (report.content_type === "event_comment") {
              tableName = "event_comments";
            }

            if (tableName) {
              const { data: content } = await supabase
                .from(tableName)
                .select("*")
                .eq("id", report.content_id)
                .single();

              if (content) {
                contentMap[`${report.content_type}:${report.content_id}`] = content;
              }
            }
          }
        }
        setContentItems(contentMap);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReportAction(
    reportId: string,
    status: string,
    moderationAction: string,
    resolutionNotes?: string
  ) {
    setActionLoading(reportId);

    try {
      const response = await fetch(`/api/moderation/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          moderation_action: moderationAction,
          resolution_notes: resolutionNotes || null,
        }),
      });

      if (response.ok) {
        await loadReports();
        setSelectedReport(null);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update report");
      }
    } catch (error) {
      console.error("Error updating report:", error);
      alert("Failed to update report");
    } finally {
      setActionLoading(null);
    }
  }

  function getContentPreview(report: Report): string {
    const key = `${report.content_type}:${report.content_id}`;
    const content = contentItems[key];
    if (!content) return "Loading...";

    const text = content.body || content.content || "";
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  }

  const REASON_LABELS: Record<string, string> = {
    spam: "Spam",
    harassment: "Harassment",
    hate_speech: "Hate Speech",
    inappropriate: "Inappropriate",
    false_info: "False Info",
    other: "Other",
  };

  if (!isAdmin) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Moderation</h1>
          <p className="text-sm text-slate-600 mt-1">
            Review and manage reported content
          </p>
        </div>
        <Link
          href="/admin/payouts"
          className="text-sm text-purple-700 hover:underline"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {["pending", "reviewing", "resolved", "dismissed"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? "bg-purple-600 text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-purple-50"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="text-center py-8 text-slate-600">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="card text-center py-8 text-slate-600">
          No {statusFilter} reports found.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="card space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                      {REASON_LABELS[report.reason] || report.reason}
                    </span>
                    <span className="text-xs text-slate-500">
                      {report.content_type.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-sm text-slate-900 bg-slate-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">Reported Content:</p>
                    <p className="text-slate-700">{getContentPreview(report)}</p>
                  </div>

                  {report.description && (
                    <div className="text-sm text-slate-700">
                      <span className="font-medium">Reporter notes: </span>
                      {report.description}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>Reported by:</span>
                    {report.reporter?.avatar_url && (
                      <Image
                        src={report.reporter.avatar_url}
                        alt=""
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    )}
                    <span>
                      {report.reporter?.full_name || report.reporter?.username || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {statusFilter === "pending" && (
                    <>
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            open: true,
                            title: "Hide Content",
                            description: "This will hide the content from public view.",
                            onConfirm: () => {
                              handleReportAction(report.id, "resolved", "hide");
                              setConfirmDialog({ ...confirmDialog, open: false });
                            },
                          });
                        }}
                        disabled={actionLoading === report.id}
                        className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                      >
                        {actionLoading === report.id ? "Processing..." : "Hide"}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            open: true,
                            title: "Delete Content",
                            description: "This will permanently delete the content. This action cannot be undone.",
                            onConfirm: () => {
                              handleReportAction(report.id, "resolved", "delete");
                              setConfirmDialog({ ...confirmDialog, open: false });
                            },
                          });
                        }}
                        disabled={actionLoading === report.id}
                        className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === report.id ? "Processing..." : "Delete"}
                      </button>
                      <button
                        onClick={() => {
                          handleReportAction(report.id, "dismissed", "none");
                        }}
                        disabled={actionLoading === report.id}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
                      >
                        {actionLoading === report.id ? "Processing..." : "Dismiss"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      />
    </div>
  );
}


