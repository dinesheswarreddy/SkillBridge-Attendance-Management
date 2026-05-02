import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import StatCard from "@/components/shared/StatCard";
import {
  CalendarDays,
  Plus,
  Link2,
  Users,
  ClipboardList,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

interface Batch {
  id: string;
  name: string;
  institution: { name: string };
  inviteCode?: string;
  _count: { students: number; sessions: number };
}

interface Session {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  batch: { name: string };
  _count: { attendance: number };
}

interface SessionAttendance {
  sessionId: string;
  title: string;
  date: string;
  batchName: string;
  totalStudents: number;
  presentCount: number;
  attendanceRate: number;
  attendance: { studentId: string; name: string; email: string; status: string }[];
}

interface Props {
  user: { id: string; name: string; role: string };
}

export default function TrainerDashboard({ user }: Props) {
  const [view, setView] = useState("sessions");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    batchId: "",
    title: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchRes, sessionRes] = await Promise.all([
        api.get("/batches"),
        api.get("/sessions"),
      ]);
      setBatches(batchRes.data);
      setSessions(sessionRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = async (batchId: string) => {
    try {
      const res = await api.post(`/batches/${batchId}/invite`);
      setInviteLinks((prev) => ({ ...prev, [batchId]: res.data.inviteLink }));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to generate invite");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const viewAttendance = async (sessionId: string) => {
    try {
      const res = await api.get(`/sessions/${sessionId}/attendance`);
      setSelectedSession(res.data);
      setView("attendance");
    } catch (err) {
      console.error(err);
    }
  };

  const createSession = async () => {
    setError(null);
    if (!form.batchId || !form.title || !form.date || !form.startTime || !form.endTime) {
      setError("All fields are required");
      return;
    }
    setCreating(true);
    try {
      await api.post("/sessions", form);
      setShowCreateSession(false);
      setForm({ batchId: "", title: "", date: "", startTime: "", endTime: "" });
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const navItems = [
    {
      label: "Sessions",
      icon: <CalendarDays className="h-4 w-4" />,
      onClick: () => setView("sessions"),
      active: view === "sessions",
    },
    {
      label: "My Batches",
      icon: <Users className="h-4 w-4" />,
      onClick: () => setView("batches"),
      active: view === "batches",
    },
  ];

  return (
    <DashboardLayout
      title="Trainer Dashboard"
      role={user.role}
      userName={user.name}
      navItems={navItems}
      activeView={view}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {view === "sessions" ? "Sessions" : view === "batches" ? "My Batches" : "Attendance"}
          </h1>
          <p className="text-gray-500 mt-1">Welcome, {user.name}</p>
        </div>
        {view === "sessions" && (
          <button
            onClick={() => setShowCreateSession(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Create Session
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="My Batches" value={batches.length} icon={<Users className="h-6 w-6" />} color="text-green-600 bg-green-50" />
        <StatCard title="Total Sessions" value={sessions.length} icon={<CalendarDays className="h-6 w-6" />} color="text-blue-600 bg-blue-50" />
        <StatCard title="Students" value={batches.reduce((sum, b) => sum + (b._count?.students || 0), 0)} icon={<ClipboardList className="h-6 w-6" />} color="text-purple-600 bg-purple-50" />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create Session</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                <select
                  value={form.batchId}
                  onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select a batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Introduction to React"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowCreateSession(false); setError(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createSession}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions View */}
      {view === "sessions" && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">All Sessions</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No sessions yet. Create your first session above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sessions.map((session) => (
                <div key={session.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{session.title}</div>
                    <div className="text-sm text-gray-500">{session.batch.name}</div>
                    <div className="text-sm text-gray-400">
                      {new Date(session.date).toLocaleDateString()} · {session.startTime} – {session.endTime}
                    </div>
                  </div>
                  <button
                    onClick={() => viewAttendance(session.id)}
                    className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Attendance
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Batches View */}
      {view === "batches" && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">My Batches</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No batches assigned. Contact your institution admin.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {batches.map((batch) => {
                const link = inviteLinks[batch.id];
                return (
                  <div key={batch.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{batch.name}</div>
                        <div className="text-sm text-gray-500">{batch.institution?.name}</div>
                        <div className="text-sm text-gray-400">
                          {batch._count?.students} students · {batch._count?.sessions} sessions
                        </div>
                      </div>
                      <button
                        onClick={() => generateInvite(batch.id)}
                        className="flex items-center gap-2 text-sm px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
                      >
                        <Link2 className="h-3.5 w-3.5" /> Generate Invite
                      </button>
                    </div>
                    {link && (
                      <div className="mt-2 flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-600 flex-1 truncate">{link}</span>
                        <button
                          onClick={() => copyToClipboard(link, batch.id)}
                          className="flex-shrink-0 text-gray-500 hover:text-gray-700"
                        >
                          {copied === batch.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Attendance Detail View */}
      {view === "attendance" && selectedSession && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{selectedSession.title}</h2>
              <p className="text-sm text-gray-500">
                {selectedSession.batchName} · {new Date(selectedSession.date).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{selectedSession.attendanceRate}%</div>
              <div className="text-sm text-gray-500">{selectedSession.presentCount}/{selectedSession.totalStudents} present</div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {selectedSession.attendance.map((a) => (
              <div key={a.studentId} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 text-sm">{a.name}</div>
                  <div className="text-xs text-gray-400">{a.email}</div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    a.status === "PRESENT"
                      ? "bg-green-100 text-green-700"
                      : a.status === "LATE"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t">
            <button onClick={() => setView("sessions")} className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to sessions
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
