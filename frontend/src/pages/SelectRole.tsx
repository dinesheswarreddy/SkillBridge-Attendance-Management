import { useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { GraduationCap, Users, Building2, BarChart3, Eye, Loader2 } from "lucide-react";

const ROLES = [
  {
    value: "STUDENT",
    label: "Student",
    description: "Log in and self-mark attendance for your sessions",
    icon: GraduationCap,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    value: "TRAINER",
    label: "Trainer",
    description: "Create sessions, manage student batches, generate invite links",
    icon: Users,
    color: "text-green-600 bg-green-50 border-green-200",
  },
  {
    value: "INSTITUTION",
    label: "Institution",
    description: "Manage trainers and batches, view attendance summaries",
    icon: Building2,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    value: "PROGRAMME_MANAGER",
    label: "Programme Manager",
    description: "Oversee all institutions and attendance data across the region",
    icon: BarChart3,
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  {
    value: "MONITORING_OFFICER",
    label: "Monitoring Officer",
    description: "Read-only access across the entire programme",
    icon: Eye,
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
];

interface Props {
  clerkUser: any;
  // getToken is passed from App so we can always fetch a fresh Clerk JWT
  // right before the POST — avoids race conditions where the axios instance
  // token was set before Clerk's session was fully ready.
  getToken: () => Promise<string | null>;
  onRoleSelected: (user: any) => void;
}

export default function SelectRole({ clerkUser, getToken, onRoleSelected }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);

    try {
      // Always get a fresh token immediately before the request.
      // This is the key fix: after Clerk sign-up the token on the shared
      // axios instance may be stale or missing. We refresh it here.
      let token: string | null = null;
      for (let i = 0; i < 10; i++) {
        token = await getToken();
        if (token) break;
        await new Promise((r) => setTimeout(r, 400));
      }

      if (!token) {
        setError("Session not ready yet. Please wait a moment and try again.");
        setLoading(false);
        return;
      }

      // Update the axios instance with the freshest token
      setAuthToken(token);

      const res = await api.post("/users/sync", {
        role: selected,
        name:
          [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
          clerkUser?.emailAddresses?.[0]?.emailAddress,
        email: clerkUser?.emailAddresses?.[0]?.emailAddress,
      });

      onRoleSelected(res.data);
    } catch (err: any) {
      console.error("Role sync error:", err);
      const msg = err?.response?.data?.error;
      if (err?.response?.status === 401) {
        setError("Authentication failed. Please refresh the page and try again.");
      } else {
        setError(msg || "Failed to set role. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white text-2xl font-bold mb-4">
            SB
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to SkillBridge</h1>
          <p className="text-gray-500 mt-1">Select your role to continue</p>
        </div>

        <div className="grid gap-3">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const isSelected = selected === role.value;

            return (
              <button
                key={role.value}
                onClick={() => setSelected(role.value)}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className={`flex-shrink-0 p-2.5 rounded-lg border ${role.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{role.label}</div>
                  <div className="text-sm text-gray-500">{role.description}</div>
                </div>
                {isSelected && (
                  <div className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selected || loading}
          className="mt-6 w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Setting up your account...
            </>
          ) : (
            "Continue"
          )}
        </button>
      </div>
    </div>
  );
}
