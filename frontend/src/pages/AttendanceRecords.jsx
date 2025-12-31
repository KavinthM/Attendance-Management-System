import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout";
import { getAllAttendance, getStudents, deleteAttendance, updateAttendance, notifyParentsForAbsents, generateFilteredReport } from "../api/client";
import { STATUS_OPTIONS } from "../utils/statusOptions";
import dayjs from "dayjs";

const AttendanceRecords = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionFilter, setSectionFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const userRole = localStorage.getItem("userRole");
  const userClass = localStorage.getItem("userClass");

  useEffect(() => {
    if (userRole === "Parent") {
      navigate("/parent-view");
    }
  }, [userRole, navigate]);

  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Notification states
  const [notifying, setNotifying] = useState(false);
  const [notifiedRecords, setNotifiedRecords] = useState(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const params = userRole === "Teacher" ? { section: userClass } : {};
      const { data } = await getAllAttendance(params);
      setRecords(data.records || []);
      if (userRole === "Teacher") {
        setSectionFilter(userClass);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Get unique sections from records
  const availableSections = useMemo(() => {
    const sections = new Set();
    records.forEach(record => {
      if (record.student?.section) {
        sections.add(record.student.section);
      }
    });
    return Array.from(sections).sort();
  }, [records]);

  // Filter records based on search criteria
  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    // Filter by search term (name or index)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(record =>
        record.student?.name?.toLowerCase().includes(term) ||
        record.student?.std_index?.toLowerCase().includes(term)
      );
    }

    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter(record =>
        dayjs(record.date).format("YYYY-MM-DD") === dateFilter
      );
    }

    // Filter by month
    if (monthFilter) {
      filtered = filtered.filter(record =>
        dayjs(record.date).format("YYYY-MM") === monthFilter
      );
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Filter by section
    if (sectionFilter) {
      filtered = filtered.filter(record => record.student?.section === sectionFilter);
    }

    return filtered;
  }, [records, searchTerm, dateFilter, monthFilter, statusFilter, sectionFilter]);

  // Get current date records that are absent/late and not yet notified
  const currentDateAbsentLateRecords = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    return records.filter(record =>
      record.student &&
      dayjs(record.date).format("YYYY-MM-DD") === today &&
      (record.status === "Absent" || record.status === "Late") &&
      !record.notifiedParent &&
      !notifiedRecords.has(record._id)
    );
  }, [records, notifiedRecords]);

  const remove = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    await deleteAttendance(id);
    await load();
  };

  const startEdit = (record) => {
    setEditingId(record._id);
    setEditStatus(record.status || "Present");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditStatus("");
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      await updateAttendance(id, { status: editStatus });
      await load();
      cancelEdit();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to update record");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setMonthFilter("");
    setStatusFilter("");
    setSectionFilter("");
  };

  const hasActiveFilters = searchTerm || dateFilter || monthFilter || statusFilter || sectionFilter;

  // Download functionality
  const downloadReport = async () => {
    try {
      // Check if there are records to download
      if (filteredRecords.length === 0) {
        alert('No records to download. Please adjust your filters.');
        return;
      }

      const { data: blob } = await generateFilteredReport({
        filters: {
          searchTerm: searchTerm || null,
          dateFilter: dateFilter || null,
          monthFilter: monthFilter || null,
          statusFilter: statusFilter || null,
          sectionFilter: sectionFilter || null,
        },
        records: filteredRecords
      });

      // Check if blob is empty
      if (blob.size === 0) {
        throw new Error('Received empty PDF file.');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;

      // Generate filename based on filters
      let filename = 'attendance_report';
      if (monthFilter) {
        filename = `attendance_report_${monthFilter}`;
      } else if (dateFilter) {
        filename = `attendance_report_${dateFilter}`;
      } else if (hasActiveFilters) {
        filename = 'attendance_report_filtered';
      }
      filename += '.pdf';

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('PDF downloaded successfully:', filename);
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download report: ${error.message}`);
    }
  };

  // Get button text based on filters
  const getDownloadButtonText = () => {
    if (monthFilter) {
      return `Download ${dayjs(monthFilter).format('MMMM YYYY')} Report`;
    } else if (hasActiveFilters) {
      return 'Download Selected Range Report';
    } else {
      return 'Download Current Report';
    }
  };

  // Calculate statistics based on filtered records
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    if (total === 0) return { present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 };

    const present = filteredRecords.filter(r => r.status === 'Present').length;
    const absent = filteredRecords.filter(r => r.status === 'Absent').length;
    const late = filteredRecords.filter(r => r.status === 'Late').length;
    const excused = filteredRecords.filter(r => r.status === 'Excused').length;

    return {
      present,
      absent,
      late,
      excused,
      attendanceRate: Math.round((present / total) * 100)
    };
  }, [filteredRecords]);

  // Notify parents for current date absent/late students
  const notifyParentsForCurrentDate = async () => {
    if (currentDateAbsentLateRecords.length === 0) {
      alert("No absent or late students found for today.");
      return;
    }

    setNotifying(true);
    try {
      const items = currentDateAbsentLateRecords
        .filter(record => record.student?._id)
        .map(record => ({
          studentId: record.student._id,
          status: record.status,
          date: dayjs(record.date).format("YYYY-MM-DD")
        }));

      console.log("Sending notifications for:", items);

      const { data } = await notifyParentsForAbsents(items);
      const succeeded = Array.isArray(data?.succeeded) ? data.succeeded : [];
      const failed = Array.isArray(data?.failed) ? data.failed : [];

      if (succeeded.length > 0) {
        // Mark records as notified locally
        const newNotifiedSet = new Set(notifiedRecords);
        currentDateAbsentLateRecords.forEach(record => {
          if (succeeded.includes(record.student._id)) {
            newNotifiedSet.add(record._id);
          }
        });
        setNotifiedRecords(newNotifiedSet);

        // Update the records in the database
        await Promise.all(
          currentDateAbsentLateRecords
            .filter(record => succeeded.includes(record.student._id))
            .map(record =>
              updateAttendance(record._id, { notifiedParent: true })
            )
        );

        const notifiedNames = succeeded.map(id => {
          const rec = currentDateAbsentLateRecords.find(r => r.student._id === id);
          return rec ? rec.student.name : 'Unknown';
        }).join(", ");

        alert(`Successfully notified parents of: ${notifiedNames}`);
      }

      if (failed.length > 0) {
        const names = failed
          .map((f) => {
            const record = currentDateAbsentLateRecords.find(r => r.student._id === f.studentId);
            return record ? `${record.student.name} (${record.student.parentPhoneNum})` : f.studentId;
          })
          .join(", ");
        alert(`Failed to notify: ${names}\n\nPlease check phone numbers and try again.`);
      }
    } catch (e) {
      console.error("Notification error:", e);
      alert(e?.response?.data?.message || "Failed to send notifications. Please check your Twilio configuration.");
    } finally {
      setNotifying(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Attendance Records</h1>
          <p className="text-slate-500 mt-1">View and manage historical attendance data</p>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-xl">
            <i className="fas fa-users-viewfinder"></i>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Records</p>
            <p className="text-2xl font-extrabold text-slate-800">{filteredRecords.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
            <i className="fas fa-chart-pie"></i>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Attendance Rate</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats.attendanceRate}%</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
            <i className="fas fa-user-xmark"></i>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Absences</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats.absent}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
            <i className="fas fa-clock"></i>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Late Arrivals</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats.late}</p>
          </div>
        </div>
      </div>

      {/* Notification Section for Current Date */}
      {currentDateAbsentLateRecords.length > 0 && (
        <div className="mb-8 bg-rose-50 border border-rose-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
              <i className="fas fa-bell text-2xl animate-pulse"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-rose-800 m-0 leading-tight">
                Action Needed
              </h3>
              <p className="text-rose-700 mt-1">
                <span className="font-bold">{currentDateAbsentLateRecords.length} student(s)</span> are marked absent or late today and parents haven't been notified yet.
              </p>
            </div>
          </div>
          <button
            className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-all hover:-translate-y-0.5 whitespace-nowrap flex items-center gap-2"
            onClick={notifyParentsForCurrentDate}
            disabled={notifying}
          >
            {notifying ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
            {notifying ? "Sending..." : "Notify All Parents"}
          </button>
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="glass-panel p-6 mb-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            {/* Search by Name/Index */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search</label>
              <div className="relative">
                <input
                  type="text"
                  className="input-field pl-10 w-full"
                  placeholder="Name or Index..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              </div>
            </div>

            {/* Filter by Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</label>
              <input
                type="date"
                className="input-field w-full"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            {/* Filter by Month */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</label>
              <input
                type="month"
                className="input-field w-full"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              />
            </div>

            {/* Filter by Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
              <div className="relative">
                <select
                  className="input-field appearance-none w-full"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
              </div>
            </div>

            {/* Filter by Section */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</label>
              <div className="relative">
                <select
                  className={`input-field appearance-none w-full ${userRole === "Teacher" ? "bg-slate-100 cursor-not-allowed opacity-75" : ""}`}
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  disabled={userRole === "Teacher"}
                >
                  <option value="">All Classes</option>
                  {availableSections.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-slate-100 gap-4">
            <div className="text-sm font-medium text-slate-500">
              Found <span className="text-slate-900 font-bold">{filteredRecords.length}</span> records
              {hasActiveFilters && <span className="text-primary-600 ml-1">(Filtered)</span>}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {hasActiveFilters && (
                <button
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  onClick={clearFilters}
                >
                  <i className="fas fa-times mr-2"></i> Clear
                </button>
              )}

              <button
                onClick={downloadReport}
                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5 whitespace-nowrap text-sm"
                title="Download filtered attendance report"
              >
                <i className="fas fa-file-pdf mr-2"></i>
                {getDownloadButtonText()}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Index No</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Reported</th>
                {userRole === "Admin" && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-12 text-slate-400"><i className="fas fa-circle-notch fa-spin text-2xl mb-2"></i><br />Loading records...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-12 text-slate-400">No records found matching your filters</td></tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <i className="far fa-calendar text-slate-400"></i>
                        {dayjs(r.date).format("YYYY-MM-DD")}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{r.student?.name}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        {r.student?.std_index}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{r.student?.section}</td>

                    <td className="px-6 py-4">
                      {editingId === r._id ? (
                        <div className="relative">
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="input-field text-xs py-1 pr-8"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]"></i>
                        </div>
                      ) : (
                        <span className={`
                           inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                           ${r.status === 'Present' ? 'bg-emerald-100 text-emerald-800' : ''}
                           ${r.status === 'Absent' ? 'bg-rose-100 text-rose-800' : ''}
                           ${r.status === 'Late' ? 'bg-amber-100 text-amber-800' : ''}
                           ${r.status === 'Excused' ? 'bg-blue-100 text-blue-800' : ''}
                        `}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 
                             ${r.status === 'Present' ? 'bg-emerald-500' : ''}
                             ${r.status === 'Absent' ? 'bg-rose-500' : ''}
                             ${r.status === 'Late' ? 'bg-amber-500' : ''}
                             ${r.status === 'Excused' ? 'bg-blue-500' : ''}
                          `}></span>
                          {r.status}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {r.notifiedParent || notifiedRecords.has(r._id) ? (
                        <span className="text-emerald-600 flex items-center gap-1.5 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full w-fit">
                          <i className="fas fa-check-circle"></i> Notified
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>

                    {userRole === "Admin" && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {editingId === r._id ? (
                            <>
                              <button
                                className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center transition-colors"
                                onClick={() => saveEdit(r._id)}
                                disabled={saving}
                                title="Save"
                              >
                                <i className="fas fa-save"></i>
                              </button>
                              <button
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors"
                                onClick={cancelEdit}
                                disabled={saving}
                                title="Cancel"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="w-8 h-8 rounded-full text-slate-400 hover:bg-primary-50 hover:text-primary-600 flex items-center justify-center transition-colors"
                                onClick={() => startEdit(r)}
                                title="Edit"
                              >
                                <i className="fas fa-pen"></i>
                              </button>
                              <button
                                className="w-8 h-8 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors"
                                onClick={() => remove(r._id)}
                                title="Delete"
                              >
                                <i className="fas fa-trash-can"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default AttendanceRecords;
