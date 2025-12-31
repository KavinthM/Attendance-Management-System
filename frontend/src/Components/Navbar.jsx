import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const { pathname } = useLocation();
  const isActive = (path) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-4 group">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-brand shadow-lg shadow-primary-500/20 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-primary-500/30">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl opacity-100"></div>
              <span className="relative text-2xl" role="img" aria-label="logo">🎓</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 font-display tracking-tight leading-none group-hover:from-primary-600 group-hover:to-primary-500 transition-all duration-300">
                WEBSTAR COLLEGE
              </h1>
              <span className="text-xs font-semibold text-primary-600 tracking-widest uppercase mt-1">Smart Alert System</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-full border border-slate-200/50 backdrop-blur-sm">
            {[
              { path: '/students', label: 'Students', icon: 'fa-user-graduate' },
              { path: '/attendance', label: 'Attendance', icon: 'fa-calendar-check' },
              { path: '/records', label: 'Records', icon: 'fa-clipboard-list' },
              { path: '/parent-view', label: 'Parent View', icon: 'fa-users' },
            ].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  relative px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2
                  ${isActive(link.path) || (link.path === '/students' && pathname === '/')
                    ? 'bg-white text-primary-600 shadow-md shadow-slate-200 ring-1 ring-slate-100'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                  }
                `}
              >
                <i className={`fa-solid ${link.icon} ${isActive(link.path) ? 'text-primary-500' : 'text-slate-400'} text-xs`}></i>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button (Placeholder) */}
          <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            <i className="fa-solid fa-bars text-xl"></i>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;