import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import StatCard from "@/components/shared/StatCard";
import { Building2, Users, TrendingUp, Eye, Loader2 } from "lucide-react";

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

export default function OfficerDashboard({ user }: Props) {
  const [summary, setSummary] = useState<ProgrammeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/programme/summary")
      .then((res) => setSummary(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const navItems = [
    { label: "Programme View", icon: <Eye className="h-4 w-4" />, onClick: () => {}, active: true },
  ];

  return (
    <DashboardLayout title="Monitoring Officer" role={user.role} userName={user.name} navItems={navItems} activeView="overview">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Programme Monitoring</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            <Eye className="h-3 w-3" /> Read-only access
          </span>
          <p className="text-gray-500 text-sm">You can view all data but cannot make changes.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : !summary ? (
        <div className="text-gray-400 text-center py-20">No data available</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard title="Institutions" value={summary.totalInstitutions} icon={<Building2 className="h-6 w-6" />} color="text-gray-600 bg-gray-100" />
            <StatCard title="Total Students" value={summary.totalStudents} icon={<Users className="h-6 w-6" />} color="text-blue-600 bg-blue-50" />
            <StatCard title="Overall Attendance" value={`${summary.overallAttendanceRate}%`} icon={<TrendingUp className="h-6 w-6" />} color="text-green-600 bg-green-50" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Attendance by Institution</h2>
            </div>
            {summary.institutions.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No institutions yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {summary.institutions.map((inst) => (
                  <div key={inst.institutionId} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">{inst.institutionName}</div>
                      <div className={`text-lg font-bold ${inst.attendanceRate >= 75 ? "text-green-600" : inst.attendanceRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {inst.attendanceRate}%
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {inst.totalBatches} batches · {inst.totalStudents} students · {inst.totalSessions} sessions
                    </div>
                    {/* Attendance bar */}
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${inst.attendanceRate >= 75 ? "bg-green-500" : inst.attendanceRate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${inst.attendanceRate}%` }}
                      />
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
