
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ResponsiveSidebar from './ResponsiveSidebar';
import { Toaster } from '@/components/ui/toaster';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex w-full overflow-x-hidden">
      <ResponsiveSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onToggleMobile={handleToggleMobile}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {children || <Outlet />}
        </main>
      </div>
      
      <Toaster />
    </div>
  );
};

export default Layout;
