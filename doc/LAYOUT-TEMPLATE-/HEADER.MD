import React, { useEffect } from "react"; // Import useEffect
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { FaUserCircle, FaSignOutAlt, FaBars, FaBell } from "react-icons/fa"; // IMPORT FaBell
import Button from "./common/Button";
import IconWrapper from "./IconWrapper";
import useUIStore from "../store/uiStore"; // IMPORT UI STORE

const Header: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const {
    toggleMobileSidebar,
    unreadNotificationsCount,
    fetchUnreadNotificationsCount,
  } = useUIStore(); // Get new states/actions
  const navigate = useNavigate();

  // Fetch unread count on mount and every few minutes (polling)
  useEffect(() => {
    fetchUnreadNotificationsCount(); // Initial fetch
    const interval = setInterval(fetchUnreadNotificationsCount, 60 * 1000); // Poll every 1 minute
    return () => clearInterval(interval); // Cleanup on unmount
  }, [fetchUnreadNotificationsCount]);

  const handleLogout = () => {
    clearAuth();
    // Clear unread count on logout
    useUIStore.getState().setUnreadNotificationsCount(0);
    navigate("/login");
  };

  const handleNotificationsClick = () => {
    navigate("/dashboard/notifications"); // Navigate to the notifications page
  };

  return (
    <header className="bg-white shadow-sm p-4 flex items-center justify-between z-30 sticky top-0"> 
      <div className="flex items-center">
        {/* Hamburger menu button for mobile (hidden on md and up) */}
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden text-seeslBlue hover:text-seeslLightBlue focus:outline-none focus:ring-2 focus:ring-seeslBlue p-2 rounded-md mr-4"
          aria-label="Open sidebar"
        >
          <IconWrapper
            icon={FaBars as React.ComponentType<any>}
            className="text-xl"
          />
        </button>
        <Link to="/dashboard" className="flex items-center space-x-2">
          <img src="/CertiDocs Primary Logo.jpg" alt="CertiDocs Logo" className="h-12 w-auto" />
          <span className="text-xl font-bold text-seeslBlue">CertiDocs SEESL <span className="text-sm">(client)</span></span>
         {/* <span className="text-xl font-bold text-seeslBlue">CertiDocs</span> */}
         {/* <span className="text-sm font-medium text-gray-500">Document Control System</span> */}
         {/* You can uncomment above line if you want a tagline next to the logo */}
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
              className="mr-2 text-xl text-seeslLightBlue"
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