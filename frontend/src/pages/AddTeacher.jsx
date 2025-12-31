import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout";

const AddTeacher = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "",
        teacherId: "",
        subject: "",
        email: "",
        phone: "",
        profilePic: null,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const userRole = localStorage.getItem("userRole");

    React.useEffect(() => {
        if (userRole === "Teacher") {
            navigate("/students");
        } else if (userRole === "Parent") {
            navigate("/parent-view");
        }
    }, [userRole, navigate]);

    React.useEffect(() => {
        const fetchNextId = async () => {
            try {
                const response = await axios.get("http://localhost:5001/teachers/next-id");
                setForm(prev => ({ ...prev, teacherId: response.data.nextId }));
            } catch (error) {
                console.error("Failed to fetch next teacher ID", error);
            }
        };
        fetchNextId();
    }, []);

    const validateField = (key, value) => {
        switch (key) {
            case "name":
                if (!value) return "Name is required";
                if (!/^[A-Z]/.test(value)) return "Name must start with a capital letter";
                return null;
            case "subject":
                if (!value) return "Class/Section is required";
                if (!/^\d+[A-Z]$/.test(value)) return "Example: 10A (Number + Uppercase)";
                return null;
            case "email":
                if (!value) return "Email is required";
                if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(value)) return "Must be a valid @gmail.com address";
                return null;
            case "phone":
                if (!value) return "Phone is required";
                if (!/^\+94\s?\d{9}$/.test(value)) return "Format: +94706754321";
                return null;
            default:
                return null;
        }
    };

    const handleChange = (key) => (e) => {
        let value = e.target.type === "file" ? e.target.files[0] : e.target.value;
        const error = key === "profilePic" ? null : validateField(key, value);

        setForm(prev => ({ ...prev, [key]: value }));
        // Update error state immediately
        setErrors(prev => ({ ...prev, [key]: error }));
    };

    const validate = () => {
        const newErrors = {};
        let isValid = true;

        Object.keys(form).forEach(key => {
            if (key !== "teacherId" && key !== "profilePic") {
                const error = validateField(key, form[key]);
                if (error) {
                    newErrors[key] = error;
                    isValid = false;
                }
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        const formData = new FormData();
        Object.keys(form).forEach((key) => {
            formData.append(key, form[key]);
        });

        try {
            await axios.post("http://localhost:5001/teachers", formData);
            navigate("/teachers");
        } catch (error) {
            console.error("Error adding teacher:", error);
            if (error.response && error.response.data && error.response.data.message) {
                alert(error.response.data.message);
            } else {
                alert("Failed to add teacher");
            }
        } finally {
            setLoading(false);
        }
    };

    const getFieldStatus = (key) => {
        const value = form[key];
        const error = errors[key];
        if (!value) return "neutral";
        if (error) return "invalid";
        return "valid";
    };

    const getInputClasses = (status) => {
        const baseClasses = "w-full rounded-xl px-4 py-3.5 outline-none transition-all focus:ring-4 text-slate-700 placeholder-slate-400 pl-10";
        if (status === "valid") {
            return `${baseClasses} border border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/10 bg-emerald-50/30 text-emerald-900`;
        }
        if (status === "invalid") {
            return `${baseClasses} border border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30 text-rose-900`;
        }
        return `${baseClasses} bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-primary-100`;
    };

    return (
        <Layout>
            <div className="min-h-screen bg-slate-50/50 p-6 md:p-12 flex items-center justify-center">
                <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 via-orange-400 to-primary-600"></div>
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold text-white mb-2">Add New Teacher</h2>
                            <p className="text-slate-400">Enter teacher details below</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
                        {/* Profile Photo Upload */}
                        <div className="flex flex-col items-center justify-center mb-6">
                            <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-50 flex items-center justify-center mb-3">
                                {form.profilePic ? (
                                    <img src={URL.createObjectURL(form.profilePic)} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <i className="fa-solid fa-camera text-slate-300 text-3xl"></i>
                                )}
                                <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                    <i className="fa-solid fa-pen text-sm"></i>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleChange("profilePic")} />
                                </label>
                            </div>
                            <span className="text-xs text-slate-500 font-medium">Upload Photo (Optional)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Teacher Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={handleChange("name")}
                                        className={getInputClasses(getFieldStatus("name"))}
                                        placeholder="Full Name (Start with Capital)"
                                    />
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <i className="fa-solid fa-user"></i>
                                    </div>
                                    {getFieldStatus("name") === "valid" && (
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500">
                                            <i className="fa-solid fa-check-circle"></i>
                                        </div>
                                    )}
                                </div>
                                {errors.name ? (
                                    <p className="text-rose-500 text-xs ml-1 flex items-center gap-1"><i className="fa-solid fa-circle-exclamation"></i> {errors.name}</p>
                                ) : (
                                    <p className="text-slate-400 text-xs ml-1">e.g. Supun Perera</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Teacher ID</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={form.teacherId}
                                        readOnly
                                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3.5 pl-10 text-slate-500 cursor-not-allowed"
                                        placeholder="Generating..."
                                    />
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                        <i className="fa-solid fa-id-badge"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Class/Section</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={form.subject}
                                        onChange={handleChange("subject")}
                                        className={getInputClasses(getFieldStatus("subject"))}
                                        placeholder="e.g. 10A"
                                    />
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <i className="fa-solid fa-chalkboard"></i>
                                    </div>
                                    {getFieldStatus("subject") === "valid" && (
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500">
                                            <i className="fa-solid fa-check-circle"></i>
                                        </div>
                                    )}
                                </div>
                                {errors.subject ? (
                                    <p className="text-rose-500 text-xs ml-1 flex items-center gap-1"><i className="fa-solid fa-circle-exclamation"></i> {errors.subject}</p>
                                ) : (
                                    <p className="text-slate-400 text-xs ml-1">Format: Number + Uppercase Letter</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Email</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={handleChange("email")}
                                        className={getInputClasses(getFieldStatus("email"))}
                                        placeholder="Email Address"
                                    />
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <i className="fa-solid fa-envelope"></i>
                                    </div>
                                    {getFieldStatus("email") === "valid" && (
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500">
                                            <i className="fa-solid fa-check-circle"></i>
                                        </div>
                                    )}
                                </div>
                                {errors.email ? (
                                    <p className="text-rose-500 text-xs ml-1 flex items-center gap-1"><i className="fa-solid fa-circle-exclamation"></i> {errors.email}</p>
                                ) : (
                                    <p className="text-slate-400 text-xs ml-1">Must be @gmail.com</p>
                                )}
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Phone Number</label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={handleChange("phone")}
                                        className={getInputClasses(getFieldStatus("phone"))}
                                        placeholder="e.g. +94706754321"
                                    />
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <i className="fa-solid fa-phone"></i>
                                    </div>
                                    {getFieldStatus("phone") === "valid" && (
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500">
                                            <i className="fa-solid fa-check-circle"></i>
                                        </div>
                                    )}
                                </div>
                                {errors.phone ? (
                                    <p className="text-rose-500 text-xs ml-1 flex items-center gap-1"><i className="fa-solid fa-circle-exclamation"></i> {errors.phone}</p>
                                ) : (
                                    <p className="text-slate-400 text-xs ml-1">Format: +94706754321</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6">
                            <button
                                type="button"
                                onClick={() => navigate("/teachers")}
                                className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || Object.keys(errors).some(k => errors[k])}
                                className={`flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold shadow-lg shadow-primary-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] ${loading || Object.keys(errors).some(k => errors[k]) ? "opacity-70 cursor-not-allowed" : ""
                                    }`}
                            >
                                {loading ? "Adding..." : "Add Teacher"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

export default AddTeacher;
