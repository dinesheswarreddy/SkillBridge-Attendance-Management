import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import StatCard from "@/components/shared/StatCard";
import {
  Building2, Users, BarChart3, TrendingUp,
  Loader2, Plus, UserPlus, X, ChevronDown, ChevronUp,
} from "lucide-react";

interface Institution {
  id: string;
  name: string;
  totalBatches: number;
  totalStudents: number;
  totalSessions: number;
  attendanceRate: number;
}

interface ProgrammeSummary {
  totalInstitutions: number;
  totalStudents: number;
  overallAttendanceRate: number;
  institutions: Institution[];
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  institutionId: string | null;
}

interface InstitutionFull {
  id: string;
  name: string;
}

interface Props {
  user: { id: string; name: string; role: string };
}

export default function ManagerDashboard({ user }: Props) {
  const [view, setView] = useState("overview");
  const [summary, setSummary] = useState<ProgrammeSummary | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionFull[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInst, setExpandedInst] = useState<string | null>(null);

  // Create Institution modal
  const [showCreateInst, setShowCreateInst] = useState(false);
  const [newInstName, setNewInstName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Assign User modal
  const [assignInst, setAssignInst] = useState<InstitutionFull | null>(null);
  const [assignRole, setAssignRole] = useState<"INSTITUTION" | "TRAINER">("INSTITUTION");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [summaryRes, instRes, usersRes] = await Promise.all([
        api.get("/programme/summary"),
        api.get("/institutions"),
        api.get("/users"),
      ]);
      setSummary(summaryRes.data);
      setInstitutions(instRes.data);
      setAllUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createInstitution = async () => {
    if (!newInstName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api.post("/institutions", { name: newInstName.trim() });
      setShowCreateInst(false);
      setNewInstName("");
      fetchAll();
    } catch (err: any) {
      setCreateError(err?.response?.data?.error || "Failed to create institution");
    } finally {
      setCreating(false);
    }
  };

  const assignUser = async () => {
    if (!assignInst || !selectedUserId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await api.post(`/institutions/${assignInst.id}/assign-user`, {
        userId: selectedUserId,
      });
      setAssignInst(null);
      setSelectedUserId("");
      fetchAll();
    } catch (err: any) {
      setAssignError(err?.response?.data?.error || "Failed to assign user");
    } finally {
      setAssigning(false);
    }
  };

  // Users eligible for the selected role who are not yet assigned to this institution
  const eligibleUsers = allUsers.filter(
    (u) => u.role === assignRole && (!u.institutionId || u.institutionId === assignInst?.id)
  );

  // Users already assigned to a given institution
  const usersForInst = (instId: string) =>
    allUsers.filter((u) => u.institutionId === instId);

  const navItems = [
    {
      label: "Overview",
      icon: <BarChart3 className="h-4 w-4" />,
      onClick: () => setView("overview"),
      active: view === "overview",
    },
    {
      label: "Institutions",
      icon: <Building2 className="h-4 w-4" />,
      onClick: () => setView("institutions"),
      active: view === "institutions",
    },
  ];

  return (
    <DashboardLayout
      title="Programme Manager"
      role={user.role}
      userName={user.name}
      navItems={navItems}
      activeView={view}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {view === "overview" ? "Programme Overview" : "Manage Institutions"}
          </h1>
          <p className="text-gray-500 mt-1">Welcome, {user.name}</p>
        </div>
        <button
          onClick={() => { setCreateError(null); setShowCreateInst(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Institution
        </button>
      </div>

      {/* Create Institution Modal */}
      {showCreateInst && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Institution</h2>
              <button onClick={() => setShowCreateInst(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name</label>
            <input
              type="text"
              value={newInstName}
              onChange={(e) => setNewInstName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createInstitution()}
              placeholder="e.g. Sunrise Polytechnic"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {createError && <p className="text-sm text-red-600 mb-3">{createError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateInst(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createInstitution}
                disabled={creating || !newInstName.trim()}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {assignInst && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold">Assign User</h2>
              <button onClick={() => setAssignInst(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Institution: <span className="font-medium text-gray-700">{assignInst.name}</span>
            </p>

            {/* Role toggle */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Role to assign</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden mb-4">
              {(["INSTITUTION", "TRAINER"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => { setAssignRole(r); setSelectedUserId(""); }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    assignRole === r
                      ? "bg-orange-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {r === "INSTITUTION" ? "Institution Admin" : "Trainer"}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Select user</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">— Choose a user —</option>
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>

            {eligibleUsers.length === 0 && (
              <p className="text-xs text-amber-600 mb-3">
                No unassigned {assignRole === "INSTITUTION" ? "Institution Admins" : "Trainers"} found.
                Ask them to sign up with the correct role first.
              </p>
            )}

            {assignError && <p className="text-sm text-red-600 mb-3">{assignError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setAssignInst(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={assignUser}
                disabled={assigning || !selectedUserId}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {assigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* ── OVERVIEW TAB ── */}
          {view === "overview" && summary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatCard title="Institutions" value={summary.totalInstitutions} icon={<Building2 className="h-6 w-6" />} color="text-orange-600 bg-orange-50" />
                <StatCard title="Total Students" value={summary.totalStudents} icon={<Users className="h-6 w-6" />} color="text-blue-600 bg-blue-50" />
                <StatCard title="Programme Attendance" value={`${summary.overallAttendanceRate}%`} icon={<TrendingUp className="h-6 w-6" />} color="text-green-600 bg-green-50" />
              </div>

              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Attendance by Institution</h2>
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
                        <div
                          className={`text-lg font-bold ${
                            inst.attendanceRate >= 75 ? "text-green-600"
                            : inst.attendanceRate >= 50 ? "text-amber-600"
                            : "text-red-600"
                          }`}
                        >
                          {inst.attendanceRate}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── INSTITUTIONS TAB ── */}
          {view === "institutions" && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">All Institutions</h2>
                <span className="text-sm text-gray-400">{institutions.length} institution{institutions.length !== 1 ? "s" : ""}</span>
              </div>

              {institutions.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No institutions yet.</p>
                  <button
                    onClick={() => setShowCreateInst(true)}
                    className="text-sm text-orange-600 hover:underline mt-2 block mx-auto"
                  >
                    Add your first institution →
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {institutions.map((inst) => {
                    const assigned = usersForInst(inst.id);
                    const admins   = assigned.filter((u) => u.role === "INSTITUTION");
                    const trainers = assigned.filter((u) => u.role === "TRAINER");
                    const isOpen   = expandedInst === inst.id;

                    return (
                      <div key={inst.id}>
                        {/* Institution row */}
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{inst.name}</div>
                            <div className="text-sm text-gray-500 mt-0.5">
                              {admins.length} admin{admins.length !== 1 ? "s" : ""} ·{" "}
                              {trainers.length} trainer{trainers.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setAssignError(null);
                                setSelectedUserId("");
                                setAssignRole("INSTITUTION");
                                setAssignInst(inst);
                              }}
                              className="text-xs px-2.5 py-1.5 border border-orange-200 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 flex items-center gap-1"
                            >
                              <UserPlus className="h-3 w-3" /> Assign User
                            </button>
                            <button
                              onClick={() => setExpandedInst(isOpen ? null : inst.id)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                            >
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded: show assigned users */}
                        {isOpen && (
                          <div className="bg-gray-50 border-t border-gray-100 px-4 pb-4 pt-2">
                            {assigned.length === 0 ? (
                              <p className="text-sm text-gray-400 italic">No users assigned yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {assigned.map((u) => (
                                  <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                                    <div>
                                      <span className="text-sm font-medium text-gray-800">{u.name}</span>
                                      <span className="text-xs text-gray-400 ml-2">{u.email}</span>
                                    </div>
                                    <span
                                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                        u.role === "INSTITUTION"
                                          ? "bg-purple-100 text-purple-700"
                                          : "bg-green-100 text-green-700"
                                      }`}
                                    >
                                      {u.role === "INSTITUTION" ? "Admin" : "Trainer"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
