const express = require("express");
const router = express.Router();
const LeaveRequestController = require("../Controllers/LeaveRequestController");

router.post("/", LeaveRequestController.submitLeaveRequest);
router.get("/", LeaveRequestController.getAllLeaveRequests);
router.get("/pending-count", LeaveRequestController.getPendingCount);
router.get("/accepted-leave", LeaveRequestController.getAcceptedLeave);
router.get("/accepted-for-date", LeaveRequestController.getAcceptedLeavesForDate);
router.put("/:id/accept", LeaveRequestController.acceptLeaveRequest);
router.put("/:id/reject", LeaveRequestController.rejectLeaveRequest);
router.delete("/pending/all", LeaveRequestController.deleteAllPendingRequests);

module.exports = router;
