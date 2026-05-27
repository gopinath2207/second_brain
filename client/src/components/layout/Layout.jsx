/**
 * Layout.jsx — Main app layout shell with Sidebar + TopBar + content area.
 */
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="main-content">
        <TopBar onMenuClick={() => setMobileOpen(true)} />

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
