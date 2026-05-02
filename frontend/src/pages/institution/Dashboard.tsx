import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import StatCard from "@/components/shared/StatCard";
import {
  Building2, Users, CalendarDays, BarChart3,
  Loader2, Plus, UserPlus, X,
} from "lucide-react";

interface Trainer {
  id: string;
  name: string;
  email: string;
  institutionId: string | null;
}

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
  overallAttendanceRate: number;
  trainers: string[];
  students: {
    studentId: string; name: string; email: string;
    attended: number; totalSessions: number; attendanceRate: number;
  }[];
}

interface Props {
  user: { id: string; name: string; role: string; institutionId?: string };
}

export default function InstitutionDashboard({ user }: Props) {
  const [view, setView] = useState("batches");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<BatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Create Batch modal
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Assign Trainer modal
  const [assignBatch, setAssignBatch] = useState<Batch | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchRes, trainerRes] = await Promise.all([
        api.get("/batches"),
        api.get("/users?role=TRAINER"),
      ]);
      setBatches(batchRes.data);
      setTrainers(trainerRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createBatch = async () => {
    if (!batchName.trim()) return;
    setBatchError(null);
    setCreatingBatch(true);
    try {
      await api.post("/batches", { name: batchName.trim(), institutionId: user.institutionId });
      setShowCreateBatch(false);
      setBatchName("");
      fetchData();
    } catch (err: any) {
      setBatchError(err?.response?.data?.error || "Failed to create batch");
    } finally {
      setCreatingBatch(false);
    }
  };

  const assignTrainer = async () => {
    if (!assignBatch || !selectedTrainerId) return;
    setAssignError(null);
    setAssigning(true);
    try {
      await api.post(`/batches/${assignBatch.id}/assign-trainer`, { trainerId: selectedTrainerId });
      setAssignBatch(null);
      setSelectedTrainerId("");
      fetchData();
    } catch (err: any) {
      setAssignError(err?.response?.data?.error || "Failed to assign trainer");
    } finally {
      setAssigning(false);
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
  const availableTrainers = trainers.filter(
    (t) => !t.institutionId || t.institutionId === user.institutionId
  );

  const navItems = [
    { label: "Batches", icon: <Users className="h-4 w-4" />, onClick: () => setView("batches"), active: view === "batches" },
    { label: "Summary", icon: <BarChart3 className="h-4 w-4" />, onClick: () => setView("summary"), active: view === "summary" },
  ];

  return (
    <DashboardLayout title="Institution Dashboard" role={user.role} userName={user.name} navItems={navItems} activeView={view}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Institution Overview</h1>
          <p className="text-gray-500 mt-1">Welcome, {user.name}</p>
          {!user.institutionId && (
            <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg inline-block">
              ⚠️ You are not linked to an institution yet. Ask your Programme Manager to assign you.
            </div>
          )}
        </div>
        {user.institutionId && (
          <button
            onClick={() => { setBatchError(null); setShowCreateBatch(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Create Batch
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Batches" value={batches.length} icon={<Building2 className="h-6 w-6" />} color="text-purple-600 bg-purple-50" />
        <StatCard title="Total Students" value={totalStudents} icon={<Users className="h-6 w-6" />} color="text-blue-600 bg-blue-50" />
        <StatCard title="Total Sessions" value={totalSessions} icon={<CalendarDays className="h-6 w-6" />} color="text-green-600 bg-green-50" />
      </div>

      {/* Create Batch Modal */}
      {showCreateBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create New Batch</h2>
              <button onClick={() => setShowCreateBatch(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
            <input
              type="text" value={batchName} onChange={(e) => setBatchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createBatch()}
              placeholder="e.g. Web Dev – Batch A 2024" autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {batchError && <p className="text-sm text-red-600 mb-3">{batchError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowCreateBatch(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={createBatch} disabled={creatingBatch || !batchName.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {creatingBatch && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Trainer Modal */}
      {assignBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold">Assign Trainer</h2>
              <button onClick={() => setAssignBatch(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Batch: <span className="font-medium text-gray-700">{assignBatch.name}</span></p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Trainer</label>
            <select value={selectedTrainerId} onChange={(e) => setSelectedTrainerId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">— Choose a trainer —</option>
              {availableTrainers.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
              ))}
            </select>
            {availableTrainers.length === 0 && (
              <p className="text-xs text-amber-600 mb-3">No trainers available yet. Ask trainers to sign up first.</p>
            )}
            {assignError && <p className="text-sm text-red-600 mb-3">{assignError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setAssignBatch(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={assignTrainer} disabled={assigning || !selectedTrainerId}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {assigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batches View */}
      {view === "batches" && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Batches & Trainers</h2>
            <span className="text-sm text-gray-400">{batches.length} batch{batches.length !== 1 ? "es" : ""}</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="mb-2">No batches yet.</p>
              {user.institutionId && (
                <button onClick={() => setShowCreateBatch(true)} className="text-sm text-purple-600 hover:underline">
                  Create your first batch →
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {batches.map((batch) => (
                <div key={batch.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{batch.name}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        Trainers:{" "}
                        {batch.trainers?.length > 0
                          ? batch.trainers.map((bt) => bt.trainer.name).join(", ")
                          : <span className="text-amber-600">None assigned</span>}
                      </div>
                      <div className="text-sm text-gray-400">
                        {batch._count?.students} students · {batch._count?.sessions} sessions
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setAssignError(null); setSelectedTrainerId(""); setAssignBatch(batch); }}
                        className="text-xs px-2.5 py-1.5 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                      >
                        <UserPlus className="h-3 w-3" /> Assign Trainer
                      </button>
                      <button
                        onClick={() => viewSummary(batch.id)} disabled={summaryLoading}
                        className="text-xs px-2.5 py-1.5 border border-purple-200 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 flex items-center gap-1"
                      >
                        <BarChart3 className="h-3 w-3" /> Summary
                      </button>
                    </div>
                  </div>
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
              <div className="text-4xl font-bold text-purple-600">{selectedSummary.overallAttendanceRate ?? 0}%</div>
              <div className="text-sm text-gray-500">Overall Attendance Rate</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Student Breakdown</h3></div>
            {selectedSummary.students?.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No students enrolled yet.</div>
            ) : (
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
            )}
          </div>
          <button onClick={() => setView("batches")} className="text-sm text-gray-500 hover:text-gray-700">← Back to batches</button>
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
