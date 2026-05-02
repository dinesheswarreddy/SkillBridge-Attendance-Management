import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import StatCard from "@/components/shared/StatCard";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Loader2,
  XCircle,
} from "lucide-react";

interface Session {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  batch: { name: string };
  trainer: { name: string };
  attendance: { status: string; markedAt: string }[];
}

interface Props {
  user: { id: string; name: string; role: string };
}

export default function StudentDashboard({ user }: Props) {
  const [view, setView] = useState("sessions");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/sessions");
      setSessions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (sessionId: string, status: "PRESENT" | "LATE") => {
    setMarking(sessionId);
    setMessage(null);
    try {
      await api.post("/attendance/mark", { sessionId, status });
      setMessage({ text: "Attendance marked successfully!", type: "success" });
      fetchSessions();
    } catch (err: any) {
      setMessage({
        text: err?.response?.data?.error || "Failed to mark attendance",
        type: "error",
      });
    } finally {
      setMarking(null);
    }
  };

  const attended = sessions.filter(
    (s) => s.attendance?.[0]?.status && s.attendance[0].status !== "ABSENT"
  ).length;
  const rate = sessions.length > 0 ? Math.round((attended / sessions.length) * 100) : 0;

  const navItems = [
    {
      label: "My Sessions",
      icon: <CalendarDays className="h-4 w-4" />,
      onClick: () => setView("sessions"),
      active: view === "sessions",
    },
  ];

  return (
    <DashboardLayout
      title="Student Dashboard"
      role={user.role}
      userName={user.name}
      navItems={navItems}
      activeView={view}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Total Sessions"
          value={sessions.length}
          icon={<CalendarDays className="h-6 w-6" />}
          color="text-blue-600 bg-blue-50"
        />
        <StatCard
          title="Attended"
          value={attended}
          icon={<CheckCircle2 className="h-6 w-6" />}
          color="text-green-600 bg-green-50"
        />
        <StatCard
          title="Attendance Rate"
          value={`${rate}%`}
          icon={<LayoutDashboard className="h-6 w-6" />}
          color="text-purple-600 bg-purple-50"
        />
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Sessions list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">My Sessions</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No sessions yet. Join a batch using an invite link.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map((session) => {
              const myAttendance = session.attendance?.[0];
              const status = myAttendance?.status;
              const sessionDate = new Date(session.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isFuture = sessionDate > today;
              const canMark = !isFuture && !status;

              return (
                <div key={session.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{session.title}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {session.batch.name} · {session.trainer.name}
                    </div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      {new Date(session.date).toLocaleDateString()} ·{" "}
                      {session.startTime} – {session.endTime}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {status === "PRESENT" && (
                      <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                        <CheckCircle2 className="h-4 w-4" /> Present
                      </span>
                    )}
                    {status === "LATE" && (
                      <span className="flex items-center gap-1 text-sm text-amber-600 font-medium">
                        <Clock className="h-4 w-4" /> Late
                      </span>
                    )}
                    {status === "ABSENT" && (
                      <span className="flex items-center gap-1 text-sm text-red-500 font-medium">
                        <XCircle className="h-4 w-4" /> Absent
                      </span>
                    )}
                    {isFuture && (
                      <span className="text-sm text-gray-400 italic">Upcoming</span>
                    )}
                    {canMark && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => markAttendance(session.id, "PRESENT")}
                          disabled={marking === session.id}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {marking === session.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Present
                        </button>
                        <button
                          onClick={() => markAttendance(session.id, "LATE")}
                          disabled={marking === session.id}
                          className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          Late
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
