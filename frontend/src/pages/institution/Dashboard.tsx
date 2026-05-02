import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import StatCard from "@/components/shared/StatCard";
import { Building2, Users, CalendarDays, BarChart3, Loader2 } from "lucide-react";

interface Batch {
  id: string;
  name: string;
  trainers: { trainer: { id: string; name: string } }[];
  _count: { students: number; sessions: number };
}

interface BatchSummary {
  batchId: string;
  batchName: string;
  totalSessions: number;
  totalStudents: number;
  attendanceRate: number;
  trainers: string[];
  students: { studentId: string; name: string; email: string; attended: number; totalSessions: number; attendanceRate: number }[];
}

interface Props {
  user: { id: string; name: string; role: string; institutionId?: string; institution?: { id: string; name: string } };
}

export default function InstitutionDashboard({ user }: Props) {
  const [view, setView] = useState("batches");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<BatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/batches");
      setBatches(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewSummary = async (batchId: string) => {
    setSummaryLoading(true);
    try {
      const res = await api.get(`/batches/${batchId}/summary`);
      setSelectedSummary(res.data);
      setView("summary");
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const totalStudents = batches.reduce((sum, b) => sum + (b._count?.students || 0), 0);
  const totalSessions = batches.reduce((sum, b) => sum + (b._count?.sessions || 0), 0);

  const navItems = [
    { label: "Batches", icon: <Users className="h-4 w-4" />, onClick: () => setView("batches"), active: view === "batches" },
    { label: "Summary", icon: <BarChart3 className="h-4 w-4" />, onClick: () => setView("summary"), active: view === "summary" },
  ];

  return (
    <DashboardLayout title="Institution Dashboard" role={user.role} userName={user.name} navItems={navItems} activeView={view}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Institution Overview</h1>
        <p className="text-gray-500 mt-1">Welcome, {user.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Batches" value={batches.length} icon={<Building2 className="h-6 w-6" />} color="text-purple-600 bg-purple-50" />
        <StatCard title="Total Students" value={totalStudents} icon={<Users className="h-6 w-6" />} color="text-blue-600 bg-blue-50" />
        <StatCard title="Total Sessions" value={totalSessions} icon={<CalendarDays className="h-6 w-6" />} color="text-green-600 bg-green-50" />
      </div>

      {/* Batches View */}
      {view === "batches" && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Batches & Trainers</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No batches found under your institution.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {batches.map((batch) => (
                <div key={batch.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{batch.name}</div>
                    <div className="text-sm text-gray-500">
                      Trainers: {batch.trainers?.map((bt) => bt.trainer.name).join(", ") || "None assigned"}
                    </div>
                    <div className="text-sm text-gray-400">
                      {batch._count?.students} students · {batch._count?.sessions} sessions
                    </div>
                  </div>
                  <button
                    onClick={() => viewSummary(batch.id)}
                    disabled={summaryLoading}
                    className="text-sm px-3 py-1.5 border border-purple-200 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 flex items-center gap-2"
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> View Summary
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary View */}
      {view === "summary" && selectedSummary && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{selectedSummary.batchName}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {selectedSummary.totalStudents} students · {selectedSummary.totalSessions} sessions ·
              Trainers: {selectedSummary.trainers?.join(", ") || "None"}
            </p>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-purple-600">{selectedSummary.overallAttendanceRate ?? selectedSummary.attendanceRate}%</div>
              <div className="text-sm text-gray-500">Overall Attendance Rate</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Student Breakdown</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {selectedSummary.students?.map((student) => (
                <div key={student.studentId} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{student.name}</div>
                    <div className="text-xs text-gray-400">{student.email}</div>
                    <div className="text-xs text-gray-500">{student.attended}/{student.totalSessions} sessions attended</div>
                  </div>
                  <div className={`text-sm font-bold ${student.attendanceRate >= 75 ? "text-green-600" : student.attendanceRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                    {student.attendanceRate}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => setView("batches")} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to batches
          </button>
        </div>
      )}

      {view === "summary" && !selectedSummary && (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Select a batch from the Batches tab to view its summary.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
