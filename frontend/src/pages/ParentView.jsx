import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout";
import { getAttendanceByStudentIndex, submitLeaveRequest, getNotificationsByStudentIndex, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead } from "../api/client";
import dayjs from "dayjs";

const ParentView = () => {
  const navigate = useNavigate();
  const [studentIndex, setStudentIndex] = useState("");

  const userRole = localStorage.getItem("userRole");
  const parentIndex = localStorage.getItem("parentStudentIndex");

  // Loading & Data States
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Justification form states
  const [showJustificationForm, setShowJustificationForm] = useState(false);
  const [justificationData, setJustificationData] = useState({
    studentIndex: "",
    studentName: "",
    parentPhone: "",
    leaveDate: "",
    reason: "",
    file: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    // Redirect non-parents if needed, though Admin might want to see this view too.
    // For now, keeping original logic but restricting access per requirements.
    if (userRole === "Teacher") {
      navigate("/students");
    }

    // Auto-load data for parents
    if (userRole === "Parent" && parentIndex) {
      setStudentIndex(parentIndex);
      loadParentData(parentIndex);
    }
  }, [userRole, parentIndex, navigate]);

  const loadParentData = async (index) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getAttendanceByStudentIndex(index);
      setStudents(data.students || []);
      setTodayRecords(data.todayRecords || []);
      setAllRecords(data.allRecords || []);
      setSearched(true);
      await loadNotifications(index);
      await loadUnreadCount(index);
    } catch (err) {
      setError("Failed to fetch child's records automatically.");
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async (index) => {
    try {
      const { data } = await getNotificationsByStudentIndex(index);
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Error loading notifications:", err);
      setNotifications([]);
    }
  };

  const loadUnreadCount = async (index) => {
    try {
      const { data } = await getUnreadNotificationCount(index);
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error("Error loading unread count:", err);
      setUnreadCount(0);
    }
  };

  // Only used by Admin if they access this page, though strictly they shouldn't see "Parent View" ideally.
  // Preserving for safety if logic allows admins here.
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!studentIndex.trim()) {
      setError("Please enter a student index number");
      return;
    }
    setLoading(true);
    setError("");
    setSearched(false);

    try {
      const { data } = await getAttendanceByStudentIndex(studentIndex);
      setStudents(data.students || []);
      setTodayRecords(data.todayRecords || []);
      setAllRecords(data.allRecords || []);
      setSearched(true);
      setError("");
      await loadNotifications(studentIndex);
      await loadUnreadCount(studentIndex);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError(err?.response?.data?.message || "Failed to fetch attendance records.");
      setStudents([]);
      setTodayRecords([]);
      setAllRecords([]);
      setSearched(false);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      await loadNotifications(studentIndex);
      await loadUnreadCount(studentIndex);
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(studentIndex);
      await loadNotifications(studentIndex);
      await loadUnreadCount(studentIndex);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleAddJustification = () => {
    setShowJustificationForm(true);
    setSubmitError("");
    if (students.length > 0) {
      setJustificationData(prev => ({
        ...prev,
        studentIndex: students[0].std_index,
        studentName: students[0].name,
        parentPhone: students[0].parentPhoneNum
      }));
    }
  };

  const handleCloseJustificationForm = () => {
    setShowJustificationForm(false);
    setJustificationData({
      studentIndex: "",
      studentName: "",
      parentPhone: "",
      leaveDate: "",
      reason: "",
      file: null
    });
    setSubmitError("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError("File size should not exceed 5MB");
        return;
      }
      setJustificationData({ ...justificationData, file });
      setSubmitError("");
    }
  };

  const handleSubmitJustification = async (e) => {
    e.preventDefault();

    if (!justificationData.studentIndex.trim()) return setSubmitError("Please enter student index number");
    if (!justificationData.studentName.trim()) return setSubmitError("Please enter student name");
    if (!justificationData.parentPhone.trim()) return setSubmitError("Please enter parent phone number");
    if (!justificationData.leaveDate) return setSubmitError("Please select the leave date");
    if (!justificationData.reason.trim()) return setSubmitError("Please enter reason for absence/late");

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        studentIndex: justificationData.studentIndex,
        studentName: justificationData.studentName,
        parentPhone: justificationData.parentPhone,
        leaveDate: justificationData.leaveDate,
        reason: justificationData.reason
      };

      await submitLeaveRequest(payload);
      alert("Leave request submitted successfully! The school will review your request.");
      handleCloseJustificationForm();
    } catch (err) {
      console.error("Error submitting justification:", err);
      setSubmitError(err?.response?.data?.message || "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to determine status color/icon
  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'emerald';
      case 'Absent': return 'rose';
      case 'Late': return 'amber';
      case 'Excused': return 'blue';
      default: return 'slate';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present': return 'fa-check';
      case 'Absent': return 'fa-times';
      case 'Late': return 'fa-clock';
      case 'Excused': return 'fa-file-medical';
      default: return 'fa-minus';
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Parent Dashboard</h1>
            <p className="text-slate-500 mt-1">
              {dayjs().format("dddd, MMMM D, YYYY")}
            </p>
          </div>

          {/* Notification & Actions */}
          <div className="flex items-center gap-3">
            {searched && (
              <button
                onClick={() => setShowNotifications(true)}
                className={`
                  relative p-3 rounded-xl transition-all duration-200
                  ${unreadCount > 0
                    ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                    : "bg-white text-slate-400 border border-slate-200 hover:text-primary-600 hover:border-primary-200 shadow-sm"
                  }
                `}
              >
                <i className="fas fa-bell text-xl"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Search for Admin (Hidden for Parent) */}
        {userRole !== "Parent" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <form onSubmit={handleSearch} className="flex gap-4">
              <input
                type="text"
                className="input-field max-w-md"
                placeholder="Enter Student Index to View as Parent..."
                value={studentIndex}
                onChange={(e) => setStudentIndex(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Loading..." : "View Dashboard"}
              </button>
            </form>
            {error && <p className="text-rose-500 mt-2 text-sm">{error}</p>}
          </div>
        )}

        {/* Main Dashboard Content */}
        {searched && (students.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column: Student Profile & Today's Status */}
            <div className="space-y-8 lg:col-span-1">

              {/* Student Profile Card */}
              {students.map((student) => (
                <div key={student._id} className="relative overflow-hidden bg-white rounded-3xl shadow-lg border border-slate-100 p-6">
                  {/* Decorative Background */}
                  <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary-500 to-indigo-500 opacity-90"></div>

                  <div className="relative z-10 flex flex-col items-center -mt-2">
                    <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-200 text-slate-500 flex items-center justify-center text-3xl font-bold shadow-md mb-3">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 text-center">{student.name}</h2>
                    <p className="text-slate-500 font-medium mb-4">{student.std_index}</p>

                    <div className="w-full grid grid-cols-2 gap-3 text-center">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-bold">Class</p>
                        <p className="font-semibold text-slate-700">{student.section}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-bold">Guardian</p>
                        <p className="font-semibold text-slate-700 truncate">{student.parentName.split(" ")[0]}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Today's Status Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <i className="fas fa-calendar-day text-primary-500"></i> Today's Status
                </h3>

                {todayRecords.length > 0 ? (
                  todayRecords.map((record) => {
                    const color = getStatusColor(record.status);
                    const icon = getStatusIcon(record.status);
                    return (
                      <div key={record._id} className={`
                           flex flex-col items-center justify-center py-8 rounded-2xl
                           bg-${color}-50 border border-${color}-100
                        `}>
                        <div className={`
                             w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4
                             bg-white text-${color}-500 shadow-sm
                           `}>
                          <i className={`fas ${icon}`}></i>
                        </div>
                        <span className={`text-3xl font-extrabold text-${color}-700`}>{record.status}</span>
                        <span className={`text-sm font-medium text-${color}-600 mt-1`}>
                          Recorded at {dayjs(record.timestamp).format("h:mm A")}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <i className="fas fa-mug-hot text-4xl mb-2 opacity-50"></i>
                    <p>No attendance recorded yet today.</p>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <button
                onClick={handleAddJustification}
                className="w-full glass-panel p-6 rounded-3xl border border-primary-100 hover:border-primary-300 shadow-md group transition-all duration-300 flex items-center justify-between text-left hover:shadow-lg hover:shadow-primary-500/10 cursor-pointer bg-gradient-to-r from-white to-primary-50/30"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-primary-700 transition-colors">Submit Leave Request</h3>
                  <p className="text-sm text-slate-500 mt-1">Notify school about absence</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <i className="fas fa-paper-plane"></i>
                </div>
              </button>

            </div>

            {/* Right Column: Attendance History */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 min-h-[500px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <i className="fas fa-history text-primary-500"></i> Attendance History
                  </h3>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Last 30 Days
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Day</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allRecords.length > 0 ? (
                          allRecords.map((record) => {
                            const color = getStatusColor(record.status);
                            return (
                              <tr key={record._id} className="hover:bg-white transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-700">
                                  {dayjs(record.date).format("MMM DD, YYYY")}
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                  {dayjs(record.date).format("dddd")}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className={`
                                             inline-flex items-center px-3 py-1 rounded-full text-xs font-bold
                                             bg-${color}-100 text-${color}-700 border border-${color}-200
                                          `}>
                                    {record.status}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td colSpan="3" className="px-6 py-12 text-center text-slate-400">
                              No history available specific to this student.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Greeting / Empty State when not searched yet (Only for Admin view really) */
          userRole !== "Parent" ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-search text-4xl text-primary-300"></i>
              </div>
              <h2 className="text-2xl font-bold text-slate-700">Student Search</h2>
              <p className="text-slate-500 max-w-md mt-2">Enter a student index above to view their parent dashboard.</p>
            </div>
          ) : (
            /* Parent Loading State */
            <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
              <div className="w-16 h-16 bg-slate-200 rounded-full mb-4"></div>
              <div className="h-4 bg-slate-200 w-48 rounded mb-2"></div>
              <div className="h-3 bg-slate-100 w-32 rounded"></div>
            </div>
          )
        ))}
      </div>

      {/* Justification Modal */}
      {showJustificationForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <i className="fas fa-file-medical text-primary-500"></i> Request Leave
              </h2>
              <button onClick={handleCloseJustificationForm} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors">
                <i className="fas fa-times text-slate-500"></i>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmitJustification} className="space-y-5">
                {/* Compact form fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Index No</label>
                    <input type="text" className="input-field bg-slate-100" value={justificationData.studentIndex} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone *</label>
                    <input type="tel" className="input-field" value={justificationData.parentPhone} onChange={e => setJustificationData({ ...justificationData, parentPhone: e.target.value })} required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reviewing Name</label>
                  <input type="text" className="input-field bg-slate-100" value={justificationData.studentName} readOnly />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Leave Date *</label>
                  <input type="date" className="input-field" value={justificationData.leaveDate} onChange={e => setJustificationData({ ...justificationData, leaveDate: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason *</label>
                  <textarea className="input-field min-h-[100px]" value={justificationData.reason} onChange={e => setJustificationData({ ...justificationData, reason: e.target.value })} required placeholder="Enter detailed reason..." />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Attachment</label>
                  <div className="relative">
                    <input type="file" id="file" className="hidden" onChange={handleFileChange} />
                    <label htmlFor="file" className="input-field flex items-center justify-between cursor-pointer hover:bg-slate-50">
                      <span className="text-slate-500 text-sm truncate">{justificationData.file ? justificationData.file.name : "Attach Medical Certificate / Letter..."}</span>
                      <i className="fas fa-paperclip text-slate-400"></i>
                    </label>
                  </div>
                </div>

                {submitError && (
                  <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-xl flex items-center gap-2">
                    <i className="fas fa-exclamation-circle"></i> {submitError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={handleCloseJustificationForm} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 btn-primary py-3 rounded-xl" disabled={submitting}>
                    {submitting ? "Sending..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800"><i className="fas fa-bell text-amber-500 mr-2"></i> Notifications</h2>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && <button onClick={handleMarkAllAsRead} className="text-xs font-bold text-primary-600 hover:underline">Mark all read</button>}
                <button onClick={() => setShowNotifications(false)} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center"><i className="fas fa-times text-slate-400"></i></button>
              </div>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-0">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <i className="far fa-bell-slash text-2xl mb-2 opacity-30"></i>
                  <p>No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map(n => (
                    <div key={n._id} onClick={() => !n.isRead && handleMarkAsRead(n._id)} className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-amber-50/40 relative' : ''}`}>
                      {!n.isRead && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-rose-500"></div>}
                      <h4 className={`text-sm font-bold mb-1 ${n.isRead ? 'text-slate-600' : 'text-slate-800'}`}>{n.title}</h4>
                      <p className="text-xs text-slate-500 mb-2">{n.message}</p>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{dayjs(n.date).format("MMM DD")} • {dayjs(n.createdAt).format("h:mm A")}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default ParentView;
