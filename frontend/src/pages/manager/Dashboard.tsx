import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import StatCard from "@/components/shared/StatCard";
import { Building2, Users, BarChart3, TrendingUp, Loader2, Plus } from "lucide-react";

interface ProgrammeSummary {
  totalInstitutions: number;
  totalStudents: number;
  overallAttendanceRate: number;
  institutions: {
    institutionId: string;
    institutionName: string;
    totalBatches: number;
    totalStudents: number;
    totalSessions: number;
    attendanceRate: number;
  }[];
}

interface Props {
  user: { id: string; name: string; role: string };
}

export default function ManagerDashboard({ user }: Props) {
  const [view, setView] = useState("overview");
  const [summary, setSummary] = useState<ProgrammeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateInstitution, setShowCreateInstitution] = useState(false);
  const [newInstName, setNewInstName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchSummary(); }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get("/programme/summary");
      setSummary(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createInstitution = async () => {
    if (!newInstName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.post("/institutions", { name: newInstName });
      setShowCreateInstitution(false);
      setNewInstName("");
      fetchSummary();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create institution");
    } finally { setCreating(false); }
  };

  const navItems = [
    { label: "Overview", icon: <BarChart3 className="h-4 w-4" />, onClick: () => setView("overview"), active: view === "overview" },
    { label: "Institutions", icon: <Building2 className="h-4 w-4" />, onClick: () => setView("institutions"), active: view === "institutions" },
  ];

  return (
    <DashboardLayout title="Programme Manager" role={user.role} userName={user.name} navItems={navItems} activeView={view}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programme Overview</h1>
          <p className="text-gray-500 mt-1">Welcome, {user.name}</p>
        </div>
        <button
          onClick={() => setShowCreateInstitution(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Institution
        </button>
      </div>

      {/* Create Institution Modal */}
      {showCreateInstitution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Add Institution</h2>
            <input
              type="text"
              value={newInstName}
              onChange={(e) => setNewInstName(e.target.value)}
              placeholder="Institution name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
            />
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowCreateInstitution(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={createInstitution} disabled={creating} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : !summary ? null : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard title="Institutions" value={summary.totalInstitutions} icon={<Building2 className="h-6 w-6" />} color="text-orange-600 bg-orange-50" />
            <StatCard title="Total Students" value={summary.totalStudents} icon={<Users className="h-6 w-6" />} color="text-blue-600 bg-blue-50" />
            <StatCard title="Programme Attendance" value={`${summary.overallAttendanceRate}%`} icon={<TrendingUp className="h-6 w-6" />} color="text-green-600 bg-green-50" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Institution Breakdown</h2>
            </div>
            {summary.institutions.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No institutions yet. Add one above.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {summary.institutions.map((inst) => (
                  <div key={inst.institutionId} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{inst.institutionName}</div>
                      <div className="text-sm text-gray-500">
                        {inst.totalBatches} batches · {inst.totalStudents} students · {inst.totalSessions} sessions
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${inst.attendanceRate >= 75 ? "text-green-600" : inst.attendanceRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                      {inst.attendanceRate}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
