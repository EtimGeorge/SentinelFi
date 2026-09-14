import { useState, useEffect, type FC } from "react";
import Link from "next/link";
import { useAuth, Role } from "../context/AuthContext";
import {
  Bell, Menu, User as UserIcon, LogOut, Sparkles,
} from "lucide-react";
import Tooltip from "../common/Tooltip";
import { apiClient } from "../../lib/api";
import useUIStore from "../../store/uiStore";
import { CurrencySelector } from "../common/CurrencySelector";
import useGlobalStore from "../../store/globalStore";
import SubscriptionBanner from "../Billing/SubscriptionBanner";
import GlobalSearch from "../common/GlobalSearch";

interface LayoutNavProps {
  toggleSidebar: () => void;
}

const LayoutNav: FC<LayoutNavProps> = ({ toggleSidebar }) => {
  const { user, logout, hasRole } = useAuth();
  const unreadNotificationsCount = useUIStore(
    (state) => state.unreadNotificationsCount,
  );
  const toggleAiAssistant = useUIStore((state) => state.toggleAiAssistant);
  const { selectedProjectId, setSelectedProjectId } = useGlobalStore();
  const [projects, setProjects] = useState<
    { project_id: string; project_name: string }[]
  >([]);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProjects = async () => {
      try {
        const res: any = await apiClient.get("/projects?limit=100");
        setProjects(res.projects || res.data?.projects || []);
      } catch (error) {
        // Ignore aborts
      }
    };
    fetchProjects();
  }, [user]);

  const hasMissingProfile = user && (!user.first_name || !user.last_name);

  return (
    <div className="flex flex-col w-full sticky top-0 z-40 overflow-visible">
      {/* PROFILE COMPLETION BANNER (For Legacy Users) */}
      {hasMissingProfile && (
        <div className="bg-brand-primary text-white px-6 py-1.5 flex items-center justify-between text-[11px] font-bold tracking-tight shadow-elev-sm border-b border-white/10">
          <div className="flex items-center gap-2 text-white">
            <div className="bg-white/20 p-1 rounded-md">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>
              PRODUCTION READINESS: Your profile is missing name data. Please
              complete it to unlock full auditing capabilities.
            </span>
          </div>
          <Link
            href="/settings"
            className="bg-white text-brand-primary px-3 py-0.5 rounded-full hover:bg-gray-100 transition-all font-black uppercase text-xs shrink-0"
          >
            Complete Now
          </Link>
        </div>
      )}

<header className="flex items-center justify-between gap-3 lg:gap-6 px-3 sm:px-6 lg:px-8 py-3 bg-brand-dark/80 backdrop-blur-xl border-b border-white/5 text-gray-300 shadow-[0_4px_30px_rgba(0,0,0,0.1)] min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={toggleSidebar}
            className="text-gray-400 focus:outline-none md:hidden p-1.5 mr-1 hover:bg-white/5 active:bg-white/10 rounded-lg transition-colors shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Global Search - replaces old search input */}
          <div className="min-w-0">
            <GlobalSearch />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 shrink-0">
          {/* Project Selector (workspace desktop context) */}
          <div className="mr-1 sm:mr-2 hidden lg:block shrink-0">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-brand-dark/80 border border-gray-700 rounded-lg py-1.5 px-2 text-xs text-brand-primary font-bold focus:border-brand-primary outline-none transition cursor-pointer max-w-[150px] truncate"
              title="Active Project Context"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </div>

          <div className="mr-1 sm:mr-2 hidden lg:block shrink-0">
            <CurrencySelector />
          </div>

          {/* AI Assistant Toggle Button */}
          <Tooltip content="SentinelFi AI Assistant" position="bottom">
            <button
              onClick={toggleAiAssistant}
              data-tour="ai-assistant-toggle"
              className="relative flex items-center justify-center lg:mx-1 text-indigo-400 focus:outline-none hover:text-indigo-300 hover:bg-indigo-900/40 h-10 w-10 rounded-md transition-colors shrink-0"
              aria-label="Toggle AI Assistant"
            >
              <Sparkles className="h-5 w-5" />
            </button>
          </Tooltip>

          <Tooltip content="Notifications" position="bottom">
            <button className="relative flex items-center justify-center lg:mx-1 text-gray-400 focus:outline-none hover:text-white transition h-10 w-10 shrink-0">
              <Bell className="h-5 w-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center h-3.5 w-3.5 bg-red-500 text-white text-xs font-bold rounded-full border border-gray-800">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </Tooltip>

          <div className="relative lg:ml-1 shrink-0 h-10 flex items-center">
            <Tooltip content="Profile" position="bottom">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="relative block w-9 h-9 overflow-hidden rounded-full shadow focus:outline-none border border-gray-700"
              >
                <div className="w-full h-full bg-brand-primary flex items-center justify-center text-xs font-bold text-white">
                  {user?.email?.[0]?.toUpperCase() || "?"}
                </div>
              </button>
            </Tooltip>

            {isUserDropdownOpen && (
              <div
                onMouseLeave={() => setIsUserDropdownOpen(false)}
                className="absolute right-0 top-11 z-10 w-48 mt-2 overflow-hidden bg-gray-800 border-b-2 border-brand-primary rounded-md elev-lg"
              >
                <Link
                  href={
                    hasRole(Role.SuperAdmin) ? "/super/settings" : "/settings"
                  }
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-primary hover:text-white border-b border-gray-700/50"
                >
                  <UserIcon className="inline-block w-4 h-4 mr-2" />
                  Profile Settings
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    logout();
                  }}
                  className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-brand-primary hover:text-white"
                >
                  <LogOut className="inline-block w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
};

export default LayoutNav;