import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-64">
        <Navbar />
        <main className="flex-1 p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
