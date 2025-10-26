import React, { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/UseAuth";
import Sidebar from "./Sidebar";
import Header from "./Header";
import reactLogo from "../../assets/react.svg";

const DashboardLayout: React.FC = () => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Measure the header's actual height and sync the logo height to it
  const headerWrapRef = useRef<HTMLDivElement | null>(null);
  const [logoHeight, setLogoHeight] = useState<number>(96);

  useEffect(() => {
    if (!headerWrapRef.current) return;

    const el = headerWrapRef.current;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setLogoHeight(rect.height || 96);
    });

    ro.observe(el);
    // initial measure
    setLogoHeight(el.getBoundingClientRect().height || 96);

    return () => ro.disconnect();
  }, []);

  // Close mobile menu when screen becomes desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) {
    return null; // Should not happen due to route protection
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-3 sm:gap-4 md:gap-6">
          {/* Left column - Desktop sidebar */}
          <div className="hidden lg:flex flex-col gap-4">
            {/* Logo height follows header height */}
            <div className="flex items-center justify-center">
              <img
                src={reactLogo}
                alt="Logo"
                style={{ height: `${logoHeight}px` }}
                className="w-auto rounded-full ring-2 ring-yellow-400"
              />
            </div>
            <Sidebar userRole={user.role} />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Wrap header so we can measure it */}
            <div ref={headerWrapRef}>
              <Header 
                onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              />
            </div>

            <main className="bg-transparent">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      {/* Mobile sidebar dropdown */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay to close dropdown when clicking outside */}
          <div 
            className="fixed inset-0 z-[100] lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="fixed top-[70px] left-3 right-3 z-[110] lg:hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-gray-100 rounded-2xl shadow-2xl p-4 max-h-[calc(100vh-90px)] overflow-y-auto">
              <Sidebar userRole={user.role} onNavigate={() => setIsMobileMenuOpen(false)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardLayout;
