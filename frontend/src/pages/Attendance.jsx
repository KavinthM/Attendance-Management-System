import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout";
import Select from "../Components/Select";
import AttendanceRow from "../Components/AttendanceRow";
import { getStudents, markAttendance, getAllAttendance, getPendingLeaveCount, getAllLeaveRequests, acceptLeaveRequest, rejectLeaveRequest, getAcceptedLeavesForDate, deleteAllPendingRequests } from "../api/client";
import dayjs from "dayjs";

const Attendance = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [section, setSection] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [rows, setRows] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [existingIdsForDate, setExistingIdsForDate] = useState(new Set());
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Leave requests states
  const [pendingCount, setPendingCount] = useState(0);
  const [showLeaveRequests, setShowLeaveRequests] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [acceptedLeaves, setAcceptedLeaves] = useState([]);

  const userRole = localStorage.getItem("userRole");
  const userClass = localStorage.getItem("userClass");

  useEffect(() => {
    if (userRole === "Parent") {
      navigate("/parent-view");
    } else if (userRole === "Admin") {
      navigate("/students");
    }
  }, [userRole, navigate]);

  const load = async () => {
    setLoading(true);
    try {
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

  const loadPendingCount = async () => {
    try {
      const { data } = await getPendingLeaveCount();
      setPendingCount(data.count || 0);
    } catch (err) {
      console.error("Error loading pending count:", err);
    }
  };

  const loadLeaveRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data } = await getAllLeaveRequests("pending");
      setLeaveRequests(data.requests || []);
    } catch (err) {
      console.error("Error loading leave requests:", err);
      // alert("Failed to load leave requests."); 
      setLeaveRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleAcceptLeave = async (id) => {
    try {
      await acceptLeaveRequest(id, "Teacher");
      // alert("Leave request accepted!");
      await loadLeaveRequests();
      await loadPendingCount();
      await loadAcceptedLeaves();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to accept leave request");
    }
  };

  const handleRejectLeave = async (id) => {
    const reason = prompt("Enter rejection reason (optional):");
    try {
      await rejectLeaveRequest(id, "Teacher", reason || "No reason provided");
      // alert("Leave request rejected!");
      await loadLeaveRequests();
      await loadPendingCount();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to reject leave request");
    }
  };

  const handleDeleteAllPending = async () => {
    if (!window.confirm("Are you sure you want to delete ALL pending leave requests? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteAllPendingRequests();
      // alert("All pending requests deleted successfully!");
      await loadLeaveRequests();
      await loadPendingCount();
      setShowLeaveRequests(false);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete pending requests");
    }
  };

  const loadAcceptedLeaves = useCallback(async () => {
    if (!date) return;
    try {
      const { data } = await getAcceptedLeavesForDate(date);
      setAcceptedLeaves(data.leaveRequests || []);
    } catch (err) {
      console.error("Error loading accepted leaves:", err);
      setAcceptedLeaves([]);
    }
  }, [date]);

  useEffect(() => {
    load();
    loadPendingCount();
  }, []);

  useEffect(() => {
    loadAcceptedLeaves();
  }, [loadAcceptedLeaves]);

  useEffect(() => {
    const id = setInterval(() => {
      setDate(dayjs().format("YYYY-MM-DD"));
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const sections = useMemo(() => {
    const set = new Set(students.map((s) => s.section));
    return Array.from(set).sort().map((s) => ({ value: s, label: s }));
  }, [students]);

  const visible = useMemo(
    () => (section ? students.filter((s) => s.section === section) : []),
    [students, section]
  );

  useEffect(() => {
    if (!section) {
      setRows({});
      return;
    }
    const map = {};
    visible.forEach((s) => {
      map[s._id] = rows[s._id] ?? { status: "Present" };
    });
    setRows(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.length, section]);

  useEffect(() => {
    const loadExisting = async () => {
      if (!section) {
        setExistingIdsForDate(new Set());
        return;
      }
      setLoadingExisting(true);
      try {
        const params = userRole === "Teacher" ? { section: userClass } : {};
        const { data } = await getAllAttendance(params);
        const list = Array.isArray(data.records) ? data.records : [];
        const ids = new Set(
          list
            .filter((r) => dayjs(r.date).format("YYYY-MM-DD") === date)
            .filter((r) => r.student?.section === section)
            .map((r) => r.student?._id)
            .filter(Boolean)
        );
        setExistingIdsForDate(ids);
      } finally {
        setLoadingExisting(false);
      }
    };
    loadExisting();
  }, [date, section]);

  const updateRow = (studentId, newRow) => {
    setRows((r) => ({ ...r, [studentId]: newRow }));
  };

  const getAcceptedLeaveForStudent = (studentIndex) => {
    return acceptedLeaves.find(leave => leave.studentIndex === studentIndex);
  };

  const nothingToSubmit = useMemo(() => {
    return visible.every((s) => existingIdsForDate.has(s._id));
  }, [visible, existingIdsForDate]);

  const submit = async () => {
    if (!section) return alert("Select a class/section first");

    setSubmitting(true);
    try {
      const toSubmit = visible.filter((s) => !existingIdsForDate.has(s._id));
      if (toSubmit.length === 0) {
        alert("Attendance already marked for all students in this section for this date.");
        return;
      }

      const payloads = toSubmit.map((s) => {
        const status = rows[s._id]?.status || "Present";
        return {
          studentId: s._id,
          date,
          status,
          notifiedParent: false // Always false when marking attendance
        };
      });

      for (const p of payloads) {
        await markAttendance(p);
      }

      setExistingIdsForDate((prev) => {
        const next = new Set(prev);
        toSubmit.forEach((s) => next.add(s._id));
        return next;
      });

      alert("Attendance marked successfully");
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to mark attendance");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mark Attendance</h1>
          <div className="flex items-center gap-2 mt-2 text-slate-500 font-medium">
            <i className="far fa-calendar-alt text-primary-500"></i>
            <span>{date}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative min-w-[240px]">
            <select
              className={`input-field appearance-none cursor-pointer pr-10 ${userRole === "Teacher" ? "bg-slate-100 cursor-not-allowed opacity-75" : ""}`}
              value={section}
              onChange={(e) => setSection(e.target.value)}
              disabled={userRole === "Teacher"}
            >
              <option value="">Select Class Section</option>
              {sections.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
          </div>
        </div>
      </div>

      {/* Pending Leave Requests Notification */}
      {pendingCount > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-pulse-subtle">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
              <i className="fas fa-file-contract text-2xl"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-800 m-0 leading-tight">
                {pendingCount} Leave Request{pendingCount > 1 ? 's' : ''} Pending
              </h3>
              <p className="text-amber-700 text-sm mt-0.5">
                Review justification requests from parents.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowLeaveRequests(true);
              loadLeaveRequests();
            }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5 whitespace-nowrap"
          >
            Review Requests
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {!section ? (
        <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-2 border-slate-300">
          <div className="inline-flex w-20 h-20 rounded-full bg-slate-50 items-center justify-center mb-6">
            <i className="fa-solid fa-chalkboard-user text-4xl text-slate-300"></i>
          </div>
          <h3 className="text-xl font-medium text-slate-600">Select a section to begin</h3>
          <p className="text-slate-400 mt-2 max-w-md mx-auto">Please choose a class section from the dropdown above to load the student list and mark attendance.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-800">Attendance Sheet</h2>
              {loadingExisting && <i className="fas fa-spinner fa-spin text-primary-500"></i>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setRows({})}
                className="btn-secondary text-xs px-3 py-1.5 h-auto text-slate-500"
                disabled={submitting}
              >
                Reset
              </button>
              <button
                onClick={submit}
                disabled={submitting || nothingToSubmit}
                className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
              >
                {submitting ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i> Submit
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Index No</th>
                  <th className="px-6 py-4">Class</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visible.map((s) => (
                  <AttendanceRow
                    key={s._id}
                    student={s}
                    row={rows[s._id] || { status: "Present" }}
                    onChange={(newRow) => updateRow(s._id, newRow)}
                    alreadyMarked={existingIdsForDate.has(s._id)}
                    acceptedLeave={getAcceptedLeaveForStudent(s.std_index)}
                  />
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                No students found in this section.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave Requests Modal */}
      {showLeaveRequests && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLeaveRequests(false)}></div>

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <i className="fas fa-clipboard-list text-primary-600"></i>
                Review Requests
              </h2>
              <div className="flex items-center gap-3">
                {leaveRequests.length > 0 && (
                  <button
                    onClick={handleDeleteAllPending}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors border border-rose-100"
                  >
                    Delete All
                  </button>
                )}
                <button onClick={() => setShowLeaveRequests(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {loadingRequests ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <i className="fas fa-circle-notch fa-spin text-3xl mb-3 text-primary-500"></i>
                  <p>Fetching requests...</p>
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                    <i className="fas fa-check text-2xl"></i>
                  </div>
                  <p className="font-medium">All caught up! No pending requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaveRequests.map((request) => (
                    <div key={request._id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student</label>
                          <p className="font-medium text-slate-900">{request.studentName}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Index No</label>
                          <p className="font-medium text-slate-700 font-mono">{request.studentIndex}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parent Phone</label>
                          <p className="font-medium text-slate-700">{request.parentPhone}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leave Date</label>
                          <div className="flex items-center gap-2 font-medium text-amber-600">
                            <i className="far fa-calendar"></i>
                            {dayjs(request.leaveDate).format("MMM DD, YYYY")}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-100">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Reason for absence</label>
                        <p className="text-slate-700 text-sm leading-relaxed">{request.reason}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                        <div className="w-full sm:w-auto">
                          {request.documentPath ? (
                            <div className="flex items-center gap-3 p-2 pr-4 bg-primary-50 border border-primary-100 rounded-lg text-primary-700">
                              <div className="w-8 h-8 rounded bg-white flex items-center justify-center shadow-sm text-primary-500">
                                <i className="fas fa-file-alt"></i>
                              </div>
                              <span className="text-sm font-medium truncate max-w-[150px]">Document Attached</span>
                              <a
                                href={`http://localhost:5000/${request.documentPath}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs bg-white hover:bg-slate-50 text-primary-600 font-bold px-3 py-1 rounded shadow-sm transition-colors"
                              >
                                View
                              </a>
                            </div>
                          ) : (
                            <div className="text-sm text-slate-400 flex items-center gap-2">
                              <i className="fas fa-ban opacity-50"></i> No proof submitted
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3 w-full sm:w-auto">
                          <button
                            onClick={() => handleRejectLeave(request._id)}
                            className="btn-danger flex-1 sm:flex-none text-sm px-4 py-2"
                          >
                            <i className="fas fa-times mr-2"></i> Reject
                          </button>
                          <button
                            onClick={() => handleAcceptLeave(request._id)}
                            className="items-center justify-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex-1 sm:flex-none text-sm flex"
                          >
                            <i className="fas fa-check mr-2"></i> Accept Request
                          </button>
                        </div>
                      </div>
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

export default Attendance;
