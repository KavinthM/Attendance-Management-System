const LeaveRequest = require("../Model/LeaveRequestModel");
const Student = require("../Model/StudentModel");

// Submit a new leave request
const submitLeaveRequest = async (req, res) => {
  const { studentIndex, studentName, parentPhone, leaveDate, reason } = req.body;

  if (!studentIndex || !studentName || !parentPhone || !leaveDate || !reason) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Verify student exists
    const student = await Student.findOne({ std_index: studentIndex.trim() });
    if (!student) {
      return res.status(404).json({ message: "Student not found with this index number" });
    }

    // Check if there's already a pending request for this date
    const existingRequest = await LeaveRequest.findOne({
      studentIndex: studentIndex.trim(),
      leaveDate: new Date(leaveDate),
      status: "pending"
    });

    if (existingRequest) {
      return res.status(409).json({ message: "A leave request for this date is already pending" });
    }

    const leaveRequest = new LeaveRequest({
      studentIndex: studentIndex.trim(),
      studentName: studentName.trim(),
      parentPhone: parentPhone.trim(),
      leaveDate: new Date(leaveDate),
      reason: reason.trim(),
      documentPath: req.file ? req.file.path : null
    });

    await leaveRequest.save();
    return res.status(201).json({
      message: "Leave request submitted successfully",
      request: leaveRequest
    });
  } catch (err) {
    console.error("Error submitting leave request:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all leave requests (with optional status filter)
const getAllLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const requests = await LeaveRequest.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ requests });
  } catch (err) {
    console.error("Error fetching leave requests:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get pending leave requests count
const getPendingCount = async (req, res) => {
  try {
    const count = await LeaveRequest.countDocuments({ status: "pending" });
    return res.status(200).json({ count });
  } catch (err) {
    console.error("Error fetching pending count:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get accepted leave for a specific student and date
const getAcceptedLeave = async (req, res) => {
  const { studentIndex, date } = req.query;

  if (!studentIndex || !date) {
    return res.status(400).json({ message: "Student index and date are required" });
  }

  try {
    const leaveRequest = await LeaveRequest.findOne({
      studentIndex: studentIndex.trim(),
      leaveDate: new Date(date),
      status: "accepted"
    });

    return res.status(200).json({ leaveRequest });
  } catch (err) {
    console.error("Error fetching accepted leave:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all accepted leaves for a specific date
const getAcceptedLeavesForDate = async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  try {
    const leaveRequests = await LeaveRequest.find({
      leaveDate: new Date(date),
      status: "accepted"
    });

    return res.status(200).json({ leaveRequests });
  } catch (err) {
    console.error("Error fetching accepted leaves:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Accept a leave request
const acceptLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const { reviewedBy } = req.body;

  try {
    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      id,
      {
        status: "accepted",
        reviewedBy: reviewedBy || "Teacher",
        reviewedAt: new Date()
      },
      { new: true }
    );

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    return res.status(200).json({
      message: "Leave request accepted",
      request: leaveRequest
    });
  } catch (err) {
    console.error("Error accepting leave request:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Reject a leave request
const rejectLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const { reviewedBy, rejectionReason } = req.body;

  try {
    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      id,
      {
        status: "rejected",
        reviewedBy: reviewedBy || "Teacher",
        reviewedAt: new Date(),
        rejectionReason: rejectionReason || "No reason provided"
      },
      { new: true }
    );

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    return res.status(200).json({
      message: "Leave request rejected",
      request: leaveRequest
    });
  } catch (err) {
    console.error("Error rejecting leave request:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete all pending leave requests
const deleteAllPendingRequests = async (req, res) => {
  try {
    const result = await LeaveRequest.deleteMany({ status: "pending" });
    return res.status(200).json({
      message: `Deleted ${result.deletedCount} pending leave request(s)`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error("Error deleting pending requests:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  submitLeaveRequest,
  getAllLeaveRequests,
  getPendingCount,
  getAcceptedLeave,
  getAcceptedLeavesForDate,
  acceptLeaveRequest,
  rejectLeaveRequest,
  deleteAllPendingRequests
};
