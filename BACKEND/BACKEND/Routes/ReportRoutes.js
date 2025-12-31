const express = require("express");
const router = express.Router();
const ReportController = require("../Controllers/ReportController");

// Generate attendance report
router.get("/attendance", ReportController.generateAttendanceReport);

// Generate monthly attendance report
router.get("/monthly", ReportController.generateMonthlyReport);

// Generate individual student report
router.get("/student", ReportController.generateStudentReport);

// Get available sections for filtering
router.get("/sections", ReportController.getAvailableSections);

// Generate filtered report based on frontend filters
router.post("/generate", ReportController.generateFilteredReport);

module.exports = router;
