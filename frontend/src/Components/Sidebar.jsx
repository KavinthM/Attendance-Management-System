import React from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";

const Sidebar = () => {
    const { pathname } = useLocation();
    const isActive = (path) => pathname === path || (path === "/students" && pathname === "/");

    const userRole = localStorage.getItem("userRole");
    const userName = localStorage.getItem("userName");

    const menuItems = [
        { path: '/students', label: 'Students', icon: 'fa-user-graduate', roles: ["Admin", "Teacher"] },
        { path: '/teachers', label: 'Teachers', icon: 'fa-chalkboard-user', roles: ["Admin"] },
        { path: '/attendance', label: 'Attendance', icon: 'fa-calendar-check', roles: ["Teacher"] },
        { path: '/records', label: 'Records', icon: 'fa-clipboard-list', roles: ["Admin", "Teacher"] },
        { path: '/parent-view', label: 'Parent View', icon: 'fa-users', roles: ["Parent"] },
    ].filter(item => item.roles.includes(userRole));

    return (
        <div className="w-64 bg-slate-900 h-screen fixed left-0 top-0 text-white flex flex-col shadow-2xl z-50">
            {/* Brand / Logo Area */}
            <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 flex items-center justify-center mb-2">
                    <img src={logo} alt="College Logo" className="w-full h-full object-contain drop-shadow-lg" />
                </div>
                <div>
                    <h2 className="font-bold text-sm tracking-widest leading-tight text-white uppercase">CMB INTERNATIONAL<br />COLLEGE</h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-3">
                        {userRole === "Admin" ? "Admin Panel" : userRole === "Parent" ? "Parent Panel" : "Teacher Panel"}
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-4 py-6 overflow-y-auto">
                <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Main Menu</p>
                <nav className="space-y-2">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`
                flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group
                ${isActive(item.path)
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }
              `}
                        >
                            <i className={`fa-solid ${item.icon} w-5 text-center ${isActive(item.path) ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'}`}></i>
                            <span className="font-medium text-sm tracking-wide">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Footer / User Profile Snippet */}
            <div className="p-4 mt-auto">
                <div className="bg-slate-800 rounded-xl p-4 mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                        <i className="fa-solid fa-user text-slate-400"></i>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold truncate">{userName || "Unknown User"}</p>
                        <span className="text-xs text-slate-400">Online</span>
                    </div>
                </div>

                <Link
                    to="/login"
                    onClick={() => localStorage.clear()}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary-900/40 transition-all active:scale-95 group"
                >
                    <i className="fa-solid fa-arrow-right-from-bracket group-hover:translate-x-1 transition-transform"></i>
                    Log Out
                </Link>
            </div>
        </div>
    );
};

export default Sidebar;
