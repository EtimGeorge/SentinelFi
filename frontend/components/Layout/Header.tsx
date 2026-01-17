import React, { useEffect } from "react";
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FaUserCircle, FaSignOutAlt, FaBars, FaBell } from "react-icons/fa";
import Button from "../common/Button";
import IconWrapper from "../IconWrapper";
import Tooltip from "../common/Tooltip";
import useUIStore from "../../store/uiStore";
// import { shallow } from 'zustand/shallow'; // REMOVED: No longer needed
import { useAuth } from '../../components/context/AuthContext';

// REMOVED: Selector function is no longer needed
// const uiStoreSelector = (state) => ({
//     unreadNotificationsCount: state.unreadNotificationsCount,
// });
  
const Header: React.FC = () => {
  console.log("Header component rendered");
  const { user, logout } = useAuth();
  const router = useRouter();

  // ✅ FIXED: Select primitive directly - no object, no shallow needed
  const unreadNotificationsCount = useUIStore((state) => state.unreadNotificationsCount);

  console.log("unreadNotificationsCount from useUIStore:", unreadNotificationsCount);
  
  // Connect/disconnect WebSocket on mount/unmount // Temporarily commented out
  // useEffect(() => {
  //   const { connectWebSocket, disconnectWebSocket } = useUIStore.getState();
  //   connectWebSocket();
  //   return () => {
  //     disconnectWebSocket();
  //   };
  // }, []);

  const handleLogout = async () => {
    await logout();
    useUIStore.getState().setUnreadNotificationsCount(0);
    router.push("/login");
  };

  const handleNotificationsClick = () => {
    router.push("/dashboard/notifications");
  };

  return (
    <header className="bg-brand-dark border-b border-gray-700/50 p-2 px-4 flex items-center justify-between z-30 sticky top-0">
      <div className="flex items-center">
        {/* Add back your hamburger button here if needed */}
        <Link href="/dashboard/home" className="flex items-center space-x-2">
          <Image src="/SentinelFi Logo Concept-bg-remv-logo-only.png" alt="SentinelFi Logo" height={36} width={144} priority={true} />
          <span className="text-lg font-bold text-brand-primary">SentinelFi <span className="text-xs">(client)</span></span>
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        <Tooltip content="Notifications">
          <button
            onClick={handleNotificationsClick}
            className="relative p-2 rounded-md text-gray-400 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-label="Notifications"
          >
            <IconWrapper
              icon={FaBell}
              className="text-xl"
            />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </Tooltip>

        {user && (
          <span className="text-gray-300 flex items-center text-sm sm:text-base">
            <IconWrapper
              icon={FaUserCircle}
              className="mr-2 text-xl text-brand-primary"
            />
            <span className="font-medium hidden sm:inline">
              {user.email.split('@')[0]}
            </span>
            <span className="capitalize text-xs sm:text-sm hidden md:inline">
              {" "}
              ({user.role})
            </span>
          </span>
        )}
        <Tooltip content="Logout">
          <Button
            onClick={handleLogout}
            variant="secondary"
            size="sm"
            className="flex items-center space-x-1 px-2 py-1 text-xs"
          >
            <IconWrapper
              icon={FaSignOutAlt}
              className="text-sm"
            />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </Tooltip>
      </div>
    </header>
  );
};

export default Header;