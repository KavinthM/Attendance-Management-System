import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout";
import { deleteStudent, getStudents, updateStudent } from "../api/client";

const Students = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [section, setSection] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", std_index: "", section: "", parentName: "", parentPhoneNum: "", email: "" });
  const [saving, setSaving] = useState(false);

  const userRole = localStorage.getItem("userRole");
  const userClass = localStorage.getItem("userClass");

  useEffect(() => {
    if (userRole === "Parent") {
      navigate("/parent-view");
    }
  }, [userRole, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      // If teacher, only get students for their class
      const params = userRole === "Teacher" ? { section: userClass } : {};
      const { data } = await getStudents(params);
      setStudents(data.students || []);
      if (userRole === "Teacher") {
        setSection(userClass);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sections = useMemo(() => {
    const set = new Set(students.map((s) => s.section));
    return Array.from(set).sort().map((s) => ({ value: s, label: s }));
  }, [students]);

  const filtered = students.filter((s) => {
    const matchesSection = !section || s.section === section;
    const matchesSearch = !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const remove = async (idOrIndex) => {
    if (!window.confirm("Delete this student?")) return;
    await deleteStudent(idOrIndex);
    await load();
  };

  const startEdit = (student) => {
    setEditingId(student._id);
    setEditForm({
      name: student.name || "",
      std_index: student.std_index || "",
      section: student.section || "",
      parentName: student.parentName || "",
      parentPhoneNum: student.parentPhoneNum || "",
      email: student.email || "",
      profilePic: null // Reset file input
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", std_index: "", section: "", parentName: "", parentPhoneNum: "", email: "", profilePic: null });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", editForm.name);
      formData.append("std_index", editForm.std_index);
      formData.append("section", editForm.section);
      formData.append("parentName", editForm.parentName);
      formData.append("parentPhoneNum", editForm.parentPhoneNum);
      formData.append("email", editForm.email);
      if (editForm.profilePic) {
        formData.append("profilePic", editForm.profilePic);
      }

      await updateStudent(id, formData);
      await load();
      cancelEdit();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const setField = (key) => (e) => {
    const value = e.target.type === "file" ? e.target.files[0] : e.target.value;
    setEditForm((f) => ({ ...f, [key]: value }));
  };

  // Helper for generating avatar initials
  const getInitials = (name) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "ST";
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Students</h1>
            <p className="text-slate-500 mt-1">Manage student directory and registrations</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="Search students..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
            <div className="relative flex-1 md:w-48">
              <select
                className={`input-field appearance-none cursor-pointer ${userRole === "Teacher" ? "bg-slate-100 cursor-not-allowed opacity-75" : ""}`}
                value={section}
                onChange={(e) => setSection(e.target.value)}
                disabled={userRole === "Teacher"}
              >
                <option value="">All Classes</option>
                {sections.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
            </div>
            {userRole === "Admin" && (
              <Link to="/students/add" className="btn-primary whitespace-nowrap">
                <i className="fa-solid fa-plus mr-2"></i> Add Student
              </Link>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Student List</h2>
            <span className="badge badge-primary">{filtered.length} Students</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3 text-primary-500"></i>
                <p>Loading directory...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Index</th>
                    <th className="px-6 py-4">Parent Info</th>
                    {userRole === "Admin" && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        {editingId === s._id ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                                {editForm.profilePic ? (
                                  <img src={URL.createObjectURL(editForm.profilePic)} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                  <i className="fa-solid fa-camera absolute inset-0 flex items-center justify-center text-slate-400"></i>
                                )}
                              </div>
                              <label className="text-xs text-primary-600 font-semibold cursor-pointer hover:underline">
                                Change Photo
                                <input type="file" className="hidden" accept="image/*" onChange={setField("profilePic")} />
                              </label>
                            </div>
                            <input className="input-field text-sm py-1" value={editForm.name} onChange={setField("name")} placeholder="Name" />
                            <input className="input-field text-sm py-1" value={editForm.section} onChange={setField("section")} placeholder="Class" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden">
                              {s.profilePic ? (
                                <img
                                  src={`http://localhost:5000/${s.profilePic.replace(/\\/g, "/")}`}
                                  alt={s.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                getInitials(s.name)
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{s.name}</div>
                              <div className="text-xs text-slate-500 font-medium">Class: {s.section}</div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === s._id ? (
                          <span className="badge badge-slate font-mono opacity-50 cursor-not-allowed" title="Auto-generated cannot be changed">{s.std_index}</span>
                        ) : (
                          <span className="badge badge-slate font-mono">{s.std_index}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === s._id ? (
                          <div className="space-y-2">
                            <input className="input-field text-sm py-1" value={editForm.parentName} onChange={setField("parentName")} placeholder="Parent Name" />
                            <input className="input-field text-sm py-1" value={editForm.parentPhoneNum} onChange={setField("parentPhoneNum")} placeholder="Phone" />
                            <input className="input-field text-sm py-1" value={editForm.email} onChange={setField("email")} placeholder="Email" />
                          </div>
                        ) : (
                          <div>
                            <div className="text-sm font-medium text-slate-700">{s.parentName}</div>
                            <div className="text-xs text-slate-400 flex flex-col gap-1 mt-0.5">
                              <span className="flex items-center gap-1"><i className="fa-solid fa-phone text-[10px] w-3 text-center"></i> {s.parentPhoneNum}</span>
                              <span className="flex items-center gap-1"><i className="fa-solid fa-envelope text-[10px] w-3 text-center"></i> {s.email}</span>
                            </div>
                          </div>
                        )}
                      </td>
                      {userRole === "Admin" && (
                        <td className="px-6 py-4 text-right">
                          {editingId === s._id ? (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => saveEdit(s._id)} disabled={saving} className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-check"></i>
                              </button>
                              <button onClick={cancelEdit} disabled={saving} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(s)} className="w-8 h-8 rounded-full text-slate-400 hover:bg-primary-50 hover:text-primary-600 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-pen"></i>
                              </button>
                              <button onClick={() => remove(s._id)} className="w-8 h-8 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                        <i className="fa-solid fa-users-slash text-4xl mb-3 opacity-20"></i>
                        <p>No students found in this section.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Students;
