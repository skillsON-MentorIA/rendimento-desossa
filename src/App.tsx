/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DianteiroView } from './components/DianteiroView';
import { TraseiroView } from './components/TraseiroView';
import { UploadView } from './components/UploadView';
import { OnePageReport } from './components/OnePageReport';
import { SettingsView } from './components/SettingsView';
import { AdminView } from './components/AdminView';
import { LoginScreen } from './components/LoginScreen';
import { LoginModal } from './components/LoginModal';

const MainLayout: React.FC = () => {
  const { currentUser } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [selectedRecordForReport, setSelectedRecordForReport] = useState<string | null>(null);

  // Layout preferences persisted in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('frigo_sidebar_collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('frigo_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleSuccessUpload = (newRecordId: string) => {
    setSelectedRecordForReport(newRecordId);
    setCurrentTab('report');
  };

  // If no user is logged in, show full screen corporative login page
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div
      className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-800 font-sans antialiased selection:bg-rose-900 selection:text-white relative"
    >
      {/* Sidebar - In-flow on desktop (no overlay!), drawer on mobile */}
      <Sidebar
        activeTab={currentTab}
        setActiveTab={(tab: string) => {
          setCurrentTab(tab);
          if (tab !== 'report') setSelectedRecordForReport(null);
        }}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={handleToggleCollapse}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Hidden on print */}
        <Header
          activeTab={currentTab}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onToggleCollapse={handleToggleCollapse}
          isCollapsed={sidebarCollapsed}
          onNavigateToOnePage={() => setCurrentTab('report')}
          onOpenLogin={() => setIsLoginModalOpen(true)}
        />

        {/* Dynamic View Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onSelectRecord={(recordId: string) => {
                setSelectedRecordForReport(recordId);
                setCurrentTab('report');
              }}
              onNavigateToOnePage={() => setCurrentTab('report')}
              onNavigateToDianteiro={() => setCurrentTab('dianteiro')}
              onNavigateToTraseiro={() => setCurrentTab('traseiro')}
            />
          )}

          {currentTab === 'dianteiro' && <DianteiroView />}

          {currentTab === 'traseiro' && <TraseiroView />}

          {currentTab === 'upload' && (
            <UploadView onSuccessUpload={handleSuccessUpload} />
          )}

          {currentTab === 'report' && (
            <OnePageReport selectedRecordId={selectedRecordForReport} />
          )}

          {(currentTab === 'admin' || currentTab === 'settings') && <AdminView />}
        </main>
      </div>

      {/* Login & Security Modal */}
      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
