import React from "react";
import Sidebar from "./Sidebar";

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
          <div className="fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
