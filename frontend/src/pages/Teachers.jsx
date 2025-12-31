import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

import Layout from "../Components/Layout";

const Teachers = () => {
    const navigate = useNavigate();
    const [teachers, setTeachers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    const userRole = localStorage.getItem("userRole");

    useEffect(() => {
        if (userRole === "Teacher") {
            navigate("/students");
        } else if (userRole === "Parent") {
            navigate("/parent-view");
        }
    }, [userRole, navigate]);

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            const response = await axios.get("http://localhost:5001/teachers");
            setTeachers(response.data.teachers || []);
        } catch (error) {
            console.error("Error fetching teachers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this teacher?")) return;
        try {
            await axios.delete(`http://localhost:5001/teachers/${id}`);
            fetchTeachers();
        } catch (error) {
            console.error("Error deleting teacher:", error);
            alert("Error deleting teacher");
        }
    };



    const filteredTeachers = teachers.filter((teacher) =>
        Object.values(teacher).some((val) =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const getInitials = (name) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <Layout>
            <div className="space-y-8 fade-in pb-24">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Teachers</h1>
                        <p className="text-slate-500 mt-1">Manage teaching staff and assignments</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/teachers/add"
                            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary-600/30 transition-all flex items-center gap-2"
                        >
                            <i className="fa-solid fa-plus"></i> Add Teacher
                        </Link>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search teachers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all text-slate-600 shadow-sm"
                    />
                    <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                </div>

                {/* Teacher List */}
                {loading ? (
                    <div className="text-center py-12">
                        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-primary-500 mb-4"></i>
                        <p className="text-slate-500">Loading teachers...</p>
                    </div>
                ) : filteredTeachers.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-chalkboard-user text-slate-400 text-2xl"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">No Teachers Found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">
                            {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first teacher to the system."}
                        </p>
                        <Link
                            to="/teachers/add"
                            className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700"
                        >
                            Add New Teacher <i className="fa-solid fa-arrow-right"></i>
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Class/Section</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTeachers.map((teacher) => (
                                        <tr key={teacher._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden border border-primary-100">
                                                        {teacher.profilePic ? (
                                                            <img
                                                                src={`http://localhost:5001/${teacher.profilePic.replace(/\\/g, "/")}`}
                                                                alt={teacher.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            getInitials(teacher.name)
                                                        )}
                                                    </div>
                                                    <span className="font-semibold text-slate-700">{teacher.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                                                    {teacher.teacherId}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 font-medium bg-orange-50 text-orange-600 px-3 py-1 rounded-full">
                                                    {teacher.subject}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <i className="fa-solid fa-envelope text-slate-400"></i>
                                                        {teacher.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <i className="fa-solid fa-phone text-slate-400"></i>
                                                        {teacher.phone}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        to={`/teachers/edit/${teacher._id}`}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                                        title="Edit Teacher"
                                                    >
                                                        <i className="fa-solid fa-pen-to-square"></i>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(teacher._id)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                        title="Delete Teacher"
                                                    >
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Teachers;
