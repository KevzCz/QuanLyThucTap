import React, { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/UseAuth";
import Sidebar from "./Sidebar";
import Header from "./Header";
import reactLogo from "../../assets/react.svg";

const DashboardLayout: React.FC = () => {
  const { user } = useAuth();
  
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

  if (!user) {
    return null; // Should not happen due to route protection
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full px-6 py-6">
        <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-6">
          {/* Left column */}
          <div className="flex flex-col gap-4">
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
          <div className="flex flex-col gap-4">
            {/* Wrap header so we can measure it */}
            <div ref={headerWrapRef}>
              <Header />
            </div>

            <main className="bg-transparent">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
