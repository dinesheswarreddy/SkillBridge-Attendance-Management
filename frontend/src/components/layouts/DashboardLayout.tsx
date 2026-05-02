import { ReactNode } from "react";
import { useClerk } from "@clerk/clerk-react";
import { LogOut, GraduationCap } from "lucide-react";

interface NavItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
}

interface Props {
  title: string;
  role: string;
  userName: string;
  navItems: NavItem[];
  children: ReactNode;
  activeView: string;
}

const ROLE_COLORS: Record<string, string> = {
  STUDENT: "bg-blue-600",
  TRAINER: "bg-green-600",
  INSTITUTION: "bg-purple-600",
  PROGRAMME_MANAGER: "bg-orange-600",
  MONITORING_OFFICER: "bg-gray-600",
};

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Student",
  TRAINER: "Trainer",
  INSTITUTION: "Institution Admin",
  PROGRAMME_MANAGER: "Programme Manager",
  MONITORING_OFFICER: "Monitoring Officer",
};

export default function DashboardLayout({
  title,
  role,
  userName,
  navItems,
  children,
}: Props) {
  const { signOut } = useClerk();
  const bgColor = ROLE_COLORS[role] || "bg-blue-600";

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className={`p-6 ${bgColor}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-lg">SkillBridge</div>
              <div className="text-xs text-white/70">Attendance System</div>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="text-sm font-medium text-gray-900 truncate">{userName}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-white text-xs ${bgColor}`}
            >
              {ROLE_LABELS[role] || role}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? `${bgColor} text-white`
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
