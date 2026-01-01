import React, { useEffect } from "react";
import Link from 'next/link'; // Changed from 'react-router-dom'
import Image from 'next/image';
import { useRouter } from 'next/router'; // Changed from 'react-router-dom'
// import useAuthStore from "../../store/authStore"; // Placeholder for SentinelFi Auth
import { FaUserCircle, FaSignOutAlt, FaBars, FaBell } from "react-icons/fa";
import Button from "../common/Button";
import IconWrapper from "../IconWrapper";
import useUIStore from "../../store/uiStore";
import { useAuth } from '../../components/context/AuthContext'; // Import actual useAuth

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    toggleMobileSidebar,
    unreadNotificationsCount,
    connectWebSocket, // NEW: connectWebSocket action
    disconnectWebSocket, // NEW: disconnectWebSocket action
  } = useUIStore();
  const router = useRouter();

  // Connect/disconnect WebSocket on mount/unmount
  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  const handleLogout = async () => {
    await logout();
    useUIStore.getState().setUnreadNotificationsCount(0);
    router.push("/login");
  };

  const handleNotificationsClick = () => {
    router.push("/dashboard/notifications"); // Changed to router.push
  };

  return (
    <header className="bg-white shadow-sm p-4 flex items-center justify-between z-30 sticky top-0">
      <div className="flex items-center">
        {/* Hamburger menu button for mobile (hidden on md and up) */}
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden text-brand-primary hover:text-brand-primary/80 focus:outline-none focus:ring-2 focus:ring-brand-primary p-2 rounded-md mr-4"
          aria-label="Open sidebar"
        >
          <IconWrapper
            icon={FaBars as React.ComponentType<any>}
            className="text-xl"
          />
        </button>
        <Link href="/dashboard" className="flex items-center space-x-2"> {/* Changed to href */}
          <Image src="/SentinelFi Logo Concept-bg-remv-logo-only.png" alt="SentinelFi Logo" height={48} width={192} /> {/* Adapted logo */}
          <span className="text-xl font-bold text-brand-primary">SentinelFi <span className="text-sm">(client)</span></span> {/* Adapted text */}
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notification Bell Icon with Badge */}
        <button
          onClick={handleNotificationsClick}
          className="relative p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-seeslBlue"
          aria-label="Notifications"
        >
          <IconWrapper
            icon={FaBell as React.ComponentType<any>}
            className="text-xl"
          />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {user && (
          <span className="text-gray-700 flex items-center text-sm sm:text-base">
            <IconWrapper
              icon={FaUserCircle as React.ComponentType<any>}
              className="mr-2 text-xl text-brand-primary"
            />
            <span className="font-medium hidden sm:inline">
              {user.username}
            </span>
            <span className="capitalize text-xs sm:text-sm hidden md:inline">
              {" "}
              ({user.role})
            </span>
          </span>
        )}
        <Button
          onClick={handleLogout}
          variant="secondary"
          size="sm"
          className="flex items-center space-x-1 px-2 py-1 text-xs"
        >
          <IconWrapper
            icon={FaSignOutAlt as React.ComponentType<any>}
            className="text-sm"
          />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
