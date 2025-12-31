import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ParticleBackground from "../Components/ParticleBackground";
import logo from "../assets/logo.png";

const Login = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState("");
    const [role, setRole] = useState("Admin");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Teacher Authentication
        if (role === "Teacher") {
            try {
                const response = await axios.post("http://localhost:5001/teachers/login", {
                    userId,
                    password
                });

                if (response.status === 200) {
                    setLoading(false);
                    // Store user info
                    localStorage.setItem("userRole", "Teacher");
                    localStorage.setItem("userClass", response.data.teacher.subject);
                    localStorage.setItem("userName", response.data.teacher.name);
                    navigate("/students");
                }
            } catch (err) {
                setLoading(false);
                if (err.response && err.response.data && err.response.data.message) {
                    setError(err.response.data.message);
                } else {
                    setError("Login failed. Check internet connection.");
                }
            }
            return;
        }

        // Parent Authentication
        if (role === "Parent") {
            try {
                const response = await axios.post("http://localhost:5001/students/login", {
                    userId, // effectively the std_index
                    password
                });

                if (response.status === 200) {
                    setLoading(false);
                    // Store parent/student info for usage in ParentView
                    localStorage.setItem("userRole", "Parent");
                    localStorage.setItem("parentStudentIndex", response.data.student.std_index);
                    localStorage.setItem("parentStudentName", response.data.student.name);
                    navigate("/parent-view");
                }
            } catch (err) {
                setLoading(false);
                if (err.response && err.response.data && err.response.data.message) {
                    setError(err.response.data.message);
                } else {
                    setError("Login failed. Check internet connection.");
                }
            }
            return;
        }

        // Hardcoded Authentication Logic for Admin
        setTimeout(() => {
            if (role === "Admin" && userId === "CMB@gmail.com" && password === "cmb123") {
                setLoading(false);
                localStorage.setItem("userRole", "Admin");
                localStorage.setItem("userName", "Admin User");
                navigate("/students");
            } else {
                setLoading(false);
                setError("Invalid Role, User ID, or Password.");
            }
        }, 1000);
    };

    return (
        <div className="relative w-full h-screen bg-slate-950 flex items-center justify-center overflow-hidden">
            {/* Particle Background */}
            <ParticleBackground />

            {/* Login Card - Glassmorphism */}
            <div className="relative z-10 w-full max-w-md p-8 mx-4">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl"></div>

                <div className="relative z-20 flex flex-col items-center text-center">
                    {/* Logo & Branding */}
                    <div className="w-24 h-24 mb-6 relative group">
                        <div className="absolute inset-0 bg-primary-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                        <img src={logo} alt="Logo" className="w-full h-full object-contain drop-shadow-2xl relative z-10" />
                    </div>

                    <h1 className="text-2xl font-bold text-white tracking-wide mb-1 uppercase font-display">
                        CMB International<br />College
                    </h1>
                    <p className="text-primary-500 text-sm font-semibold tracking-widest uppercase mb-8 opacity-0">_</p>

                    {error && (
                        <div className="mb-6 p-3 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-200 text-sm font-medium animate-pulse flex items-center justify-center gap-2">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="w-full space-y-5 -mt-4">
                        {/* Role Selection */}
                        <div className="space-y-1 text-left">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Select Role</label>
                            <div className="relative">
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 pl-11 text-white appearance-none focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all cursor-pointer font-medium"
                                >
                                    <option value="Admin">Admin</option>
                                    <option value="Teacher">Teacher</option>
                                    <option value="Parent">Parent</option>
                                </select>
                                <i className="fa-solid fa-user-tag absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"></i>
                                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs"></i>
                            </div>
                        </div>

                        {/* User ID */}
                        <div className="space-y-1 text-left">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">User ID</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 pl-11 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                    placeholder="e.g. ADM001"
                                    required
                                />
                                <i className="fa-solid fa-id-badge absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                            </div>
                        </div>

                        <div className="space-y-1 text-left">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 pl-11 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold tracking-wide shadow-lg shadow-primary-900/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${loading ? 'opacity-80 cursor-not-allowed' : 'hover:shadow-primary-600/20'}`}
                        >
                            {loading ? (
                                <>
                                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                                    Signing In...
                                </>
                            ) : (
                                <>
                                    Sign In <i className="fa-solid fa-arrow-right-to-bracket"></i>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 w-full">
                        <p className="text-xs text-slate-500">
                            Protected by Smart Alert System v1.0
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
