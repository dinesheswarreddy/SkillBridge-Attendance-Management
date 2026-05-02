import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import {
  useAuth,
  useUser,
} from "@clerk/clerk-react";
import { setAuthToken, api } from "@/lib/api";

// Pages
import SelectRole from "@/pages/SelectRole";
import SignInPage from "@/pages/SignIn";
import SignUpPage from "@/pages/SignUp";
import StudentDashboard from "@/pages/student/Dashboard";
import TrainerDashboard from "@/pages/trainer/Dashboard";
import InstitutionDashboard from "@/pages/institution/Dashboard";
import ManagerDashboard from "@/pages/manager/Dashboard";
import OfficerDashboard from "@/pages/officer/Dashboard";
import JoinBatch from "@/pages/JoinBatch";
import { Loader2 } from "lucide-react";

type UserRole =
  | "STUDENT"
  | "TRAINER"
  | "INSTITUTION"
  | "PROGRAMME_MANAGER"
  | "MONITORING_OFFICER";

interface AppUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  institutionId?: string;
}

const ROLE_ROUTES: Record<UserRole, string> = {
  STUDENT: "/student",
  TRAINER: "/trainer",
  INSTITUTION: "/institution",
  PROGRAMME_MANAGER: "/manager",
  MONITORING_OFFICER: "/officer",
};

// Waits for Clerk to produce a non-null token, retrying up to maxAttempts times.
// Clerk can take a few seconds after sign-up to finalise the session.
async function waitForToken(
  getToken: () => Promise<string | null>,
  maxAttempts = 10,
  delayMs = 500
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const token = await getToken();
    if (token) return token;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

function AuthenticatedApp() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        // Wait until Clerk's session is ready and a token is available.
        // After sign-up the token can be null for 1-3 seconds.
        const token = await waitForToken(getToken);

        if (!token) {
          console.error("Could not obtain Clerk token after retries");
          setLoading(false);
          return;
        }

        // Set token on the axios instance for all future requests
        setAuthToken(token);

        // Try to fetch the user's profile from our DB
        const res = await api.get("/users/me");
        setAppUser(res.data);
      } catch (err: any) {
        if (err?.response?.status === 401) {
          // 401 from /users/me means the user is authenticated with Clerk
          // but hasn't been synced to our DB yet (new sign-up).
          // The token IS set on the axios instance — SelectRole will work fine.
          setAppUser(null);
        } else {
          console.error("Auth init error:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isLoaded, isSignedIn, getToken]);

  // Refresh token every 55 min (Clerk JWTs expire after 1 hour)
  useEffect(() => {
    if (!isSignedIn) return;
    const interval = setInterval(async () => {
      const token = await getToken();
      if (token) setAuthToken(token);
    }, 55 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isSignedIn, getToken]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-gray-400 mt-3">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <Routes>
      {/* Public join route */}
      <Route path="/join/:inviteCode" element={<JoinBatch appUser={appUser} />} />

      {/* Custom sign-in / sign-up — no email verification prompt */}
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />

      {/* Role selection — shown after Clerk sign-up, before DB user exists */}
      <Route
        path="/select-role"
        element={
          appUser ? (
            <Navigate to={ROLE_ROUTES[appUser.role]} replace />
          ) : (
            <SelectRole
              clerkUser={clerkUser}
              // Pass getToken so SelectRole can always fetch a fresh JWT
              getToken={getToken}
              onRoleSelected={(user) => {
                setAppUser(user);
                navigate(ROLE_ROUTES[user.role]);
              }}
            />
          )
        }
      />

      {/* Role dashboards */}
      <Route
        path="/student/*"
        element={
          appUser?.role === "STUDENT" ? (
            <StudentDashboard user={appUser} />
          ) : (
            <Navigate to={appUser ? ROLE_ROUTES[appUser.role] : "/select-role"} replace />
          )
        }
      />
      <Route
        path="/trainer/*"
        element={
          appUser?.role === "TRAINER" ? (
            <TrainerDashboard user={appUser} />
          ) : (
            <Navigate to={appUser ? ROLE_ROUTES[appUser.role] : "/select-role"} replace />
          )
        }
      />
      <Route
        path="/institution/*"
        element={
          appUser?.role === "INSTITUTION" ? (
            <InstitutionDashboard user={appUser} />
          ) : (
            <Navigate to={appUser ? ROLE_ROUTES[appUser.role] : "/select-role"} replace />
          )
        }
      />
      <Route
        path="/manager/*"
        element={
          appUser?.role === "PROGRAMME_MANAGER" ? (
            <ManagerDashboard user={appUser} />
          ) : (
            <Navigate to={appUser ? ROLE_ROUTES[appUser.role] : "/select-role"} replace />
          )
        }
      />
      <Route
        path="/officer/*"
        element={
          appUser?.role === "MONITORING_OFFICER" ? (
            <OfficerDashboard user={appUser} />
          ) : (
            <Navigate to={appUser ? ROLE_ROUTES[appUser.role] : "/select-role"} replace />
          )
        }
      />

      {/* Default redirect */}
      <Route
        path="/"
        element={
          <Navigate
            to={appUser ? ROLE_ROUTES[appUser.role] : "/select-role"}
            replace
          />
        }
      />
      <Route
        path="*"
        element={
          <Navigate
            to={appUser ? ROLE_ROUTES[appUser.role] : "/select-role"}
            replace
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}
