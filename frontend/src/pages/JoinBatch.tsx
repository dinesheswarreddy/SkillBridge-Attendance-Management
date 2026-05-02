import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { GraduationCap, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface BatchInfo {
  id: string;
  name: string;
  institution: { name: string };
  inviteCode: string;
  _count: { students: number };
}

interface Props {
  appUser: { id: string; role: string; name: string } | null;
}

export default function JoinBatch({ appUser }: Props) {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteCode) return;
    api
      .get(`/batches/join/${inviteCode}`)
      .then((res) => setBatch(res.data))
      .catch(() => setError("This invite link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!batch || !appUser) return;

    if (appUser.role !== "STUDENT") {
      setResult({ success: false, message: "Only students can join batches via invite link." });
      return;
    }

    setJoining(true);
    try {
      await api.post(`/batches/${batch.id}/join`, { inviteCode: batch.inviteCode });
      setResult({ success: true, message: `You've successfully joined "${batch.name}"!` });
      setTimeout(() => navigate("/student"), 2000);
    } catch (err: any) {
      setResult({
        success: false,
        message: err?.response?.data?.error || "Failed to join batch.",
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white text-2xl font-bold mb-4">
            SB
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join Batch</h1>
          <p className="text-gray-500 mt-1">You've been invited to join a SkillBridge batch</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : batch && !result ? (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="text-sm text-blue-600 font-medium mb-1">You're joining:</div>
              <div className="text-xl font-bold text-gray-900">{batch.name}</div>
              <div className="text-gray-500 text-sm mt-1">{batch.institution.name}</div>
              <div className="text-gray-400 text-sm">{batch._count.students} students enrolled</div>
            </div>

            {!appUser ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">Please sign in to join this batch.</p>
                <button
                  onClick={() => navigate(`/sign-in?redirect=/join/${inviteCode}`)}
                  className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
                >
                  Sign In
                </button>
              </div>
            ) : appUser.role !== "STUDENT" ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                Only students can join batches. You're logged in as a {appUser.role.replace("_", " ").toLowerCase()}.
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                {joining ? "Joining..." : "Join Batch"}
              </button>
            )}
          </div>
        ) : result ? (
          <div className="text-center">
            {result.success ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-700 font-medium">{result.message}</p>
                <p className="text-gray-400 text-sm mt-2">Redirecting to your dashboard...</p>
              </>
            ) : (
              <>
                <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 font-medium">{result.message}</p>
                <button onClick={() => navigate("/student")} className="mt-4 text-sm text-blue-600 hover:underline">
                  Go to dashboard
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
