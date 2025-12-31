const Attendance = require("../Model/AttendanceModel");
const Student = require("../Model/StudentModel");
const { jsPDF } = require("jspdf");
const autoTable = require('jspdf-autotable').default;

// Helper function to calculate attendance statistics
const calculateAttendanceStats = (records) => {
  const stats = {
    totalRecords: records.length,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendancePercentage: 0,
    byStudent: {},
    bySection: {},
    byDate: {}
  };

  records.forEach(record => {
    // Safety check for invalid records
    if (!record || !record.student) return;

    // Handle student ID safely
    const student = record.student;
    const studentId = student._id ? (typeof student._id === 'object' ? student._id.toString() : student._id) : 'unknown';
    const section = student.section || 'Unassigned';

    // Safety check for date
    if (!record.date) return;
    const date = new Date(record.date).toISOString().split('T')[0];

    // Count by status
    const status = record.status ? record.status.toLowerCase() : 'unknown';
    if (stats[status] !== undefined) stats[status]++;

    // Count by student
    if (!stats.byStudent[studentId]) {
      stats.byStudent[studentId] = {
        name: student.name || 'Unknown',
        index: student.std_index || 'N/A',
        section: section,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
      };
    }
    const sStats = stats.byStudent[studentId];
    sStats.total++;
    if (sStats[status] !== undefined) sStats[status]++;

    // Count by section
    if (!stats.bySection[section]) {
      stats.bySection[section] = {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
      };
    }
    const sectStats = stats.bySection[section];
    sectStats.total++;
    if (sectStats[status] !== undefined) sectStats[status]++;

    // Count by date
    if (!stats.byDate[date]) {
      stats.byDate[date] = {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
      };
    }
    const dStats = stats.byDate[date];
    dStats.total++;
    if (dStats[status] !== undefined) dStats[status]++;
  });

  // Calculate attendance percentage
  if (stats.totalRecords > 0) {
    stats.attendancePercentage = ((stats.present + stats.excused) / stats.totalRecords * 100).toFixed(2);
  }

  // Calculate individual student percentages
  Object.keys(stats.byStudent).forEach(studentId => {
    const student = stats.byStudent[studentId];
    student.attendancePercentage = student.total > 0 ?
      ((student.present + student.excused) / student.total * 100).toFixed(2) : 0;
  });

  // Calculate section percentages
  Object.keys(stats.bySection).forEach(section => {
    const sectionStats = stats.bySection[section];
    sectionStats.attendancePercentage = sectionStats.total > 0 ?
      ((sectionStats.present + sectionStats.excused) / sectionStats.total * 100).toFixed(2) : 0;
  });

  return stats;
};

// Generate detailed student report with individual records and parent info
const generateStudentDetailedReport = (doc, records, stats, filters) => {
  try {
    const student = records[0].student;
    if (!student) throw new Error("Student data missing in record");

    const studentId = student._id ? (typeof student._id === 'object' ? student._id.toString() : student._id) : null;
    if (!studentId) throw new Error("Student ID missing");

    const studentStats = stats.byStudent[studentId];
    if (!studentStats) throw new Error(`Statistics calculation missing for student ${studentId}`);

    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Header Section
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185); // Blue
    doc.text("SMART ALERT", 14, yPosition);

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(127, 140, 141); // Grey
    doc.text("Individual Student Report", 14, yPosition + 8);

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    const reportDate = new Date().toLocaleDateString();
    doc.text(`Generated: ${reportDate}`, pageWidth - 14, yPosition, { align: "right" });

    yPosition += 25;

    // Student Profile Card
    doc.setDrawColor(220);
    doc.setFillColor(248, 249, 250); // Light Grey Background
    doc.rect(14, yPosition, pageWidth - 28, 55, 'FD');

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("Student Profile", 20, yPosition + 12);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);

    // Left Column
    let infoLeftY = yPosition + 25;
    doc.text(`Name: ${student.name || 'N/A'}`, 20, infoLeftY);
    doc.text(`Index: ${student.std_index || 'N/A'}`, 20, infoLeftY + 8);
    doc.text(`Section: ${student.section || 'N/A'}`, 20, infoLeftY + 16);

    // Right Column
    let infoRightY = yPosition + 25;
    doc.text(`Parent: ${student.parentName || 'N/A'}`, 110, infoRightY);
    doc.text(`Phone: ${student.parentPhoneNum || 'N/A'}`, 110, infoRightY + 8);

    // Attendance Key Metric
    const attendanceRate = studentStats.total > 0 ?
      (((studentStats.present + studentStats.late) / studentStats.total) * 100).toFixed(1) : '0.0';

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");

    // Color coding for rate
    if (parseFloat(attendanceRate) >= 80) doc.setTextColor(46, 204, 113); // Green
    else if (parseFloat(attendanceRate) >= 60) doc.setTextColor(243, 156, 18); // Orange
    else doc.setTextColor(231, 76, 60); // Red

    doc.text(`${attendanceRate}%`, pageWidth - 25, yPosition + 35, { align: "right" });
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Attendance Rate", pageWidth - 25, yPosition + 45, { align: "right" });

    yPosition += 70;

    // Attendance Records Table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("Attendance History", 14, yPosition);
    yPosition += 5;

    const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

    const recordRows = sortedRecords.map(record => [
      new Date(record.date).toLocaleDateString(),
      record.status || 'Unknown',
      record.justification || '-',
      record.notifiedParent ? "Yes" : "No"
    ]);

    autoTable(doc, {
      head: [["Date", "Status", "Justification", "Parent Notified"]],
      body: recordRows,
      startY: yPosition,
      theme: 'striped',
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40, fontStyle: 'bold' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 1) {
          const status = data.cell.raw;
          if (status === 'Present') data.cell.styles.textColor = [46, 204, 113];
          else if (status === 'Absent') data.cell.styles.textColor = [231, 76, 60];
          else if (status === 'Late') data.cell.styles.textColor = [243, 156, 18];
          else if (status === 'Excused') data.cell.styles.textColor = [52, 152, 219];
        }
      }
    });

  } catch (error) {
    console.error("Error generating student detailed report:", error);
    doc.text("Error generating report details: " + error.message, 14, 200);
  }
};

// Generate general summary report using jsPDF
const generateGeneralSummaryReport = (doc, records, stats, filters) => {
  try {
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Title Section
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("SMART ALERT", 14, yPosition);

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(127, 140, 141);
    doc.text("Attendance Analytics Report", 14, yPosition + 8);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const reportDate = new Date().toLocaleDateString();
    doc.text(`Generated: ${reportDate}`, pageWidth - 14, yPosition, { align: "right" });

    yPosition += 25;

    // Filters Section (if any applied)
    if (filters && Object.keys(filters).some(key => filters[key])) {
      doc.setDrawColor(220);
      doc.setFillColor(250, 250, 250);
      doc.rect(14, yPosition, pageWidth - 28, 25, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("Filters Applied:", 20, yPosition + 16);
      doc.setTextColor(50);

      let filterText = [];
      if (filters && filters.sectionFilter) filterText.push(`Section: ${filters.sectionFilter}`);
      if (filters && filters.dateFilter) filterText.push(`Date: ${filters.dateFilter}`);
      if (filters && filters.statusFilter) filterText.push(`Status: ${filters.statusFilter}`);
      if (filters && filters.searchTerm) filterText.push(`Search: "${filters.searchTerm}"`);

      doc.text(filterText.join('  |  '), 50, yPosition + 16);
      yPosition += 35;
    }

    // Overall Statistics Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("Overall Summary", 14, yPosition);
    yPosition += 8;

    const summaryData = [
      ['Total Records', stats.totalRecords],
      ['Present', `${stats.present} (${stats.totalRecords > 0 ? ((stats.present / stats.totalRecords) * 100).toFixed(1) : 0}%)`],
      ['Absent', `${stats.absent} (${stats.totalRecords > 0 ? ((stats.absent / stats.totalRecords) * 100).toFixed(1) : 0}%)`],
      ['Late', `${stats.late} (${stats.totalRecords > 0 ? ((stats.late / stats.totalRecords) * 100).toFixed(1) : 0}%)`],
      ['Excused', `${stats.excused} (${stats.totalRecords > 0 ? ((stats.excused / stats.totalRecords) * 100).toFixed(1) : 0}%)`],
      ['Attendance Rate', `${stats.attendancePercentage}%`]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94] },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold', fillColor: [245, 245, 245] }
      },
      tableWidth: pageWidth / 2,
      margin: { left: 14 }
    });

    // Valid use of finalY with fallback
    yPosition = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 20 : yPosition + 60;

    // Class-wise Statistics
    const sections = Object.keys(stats.bySection || {});
    if (sections.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 62, 80);
      doc.text("Class-wise Statistics", 14, yPosition);
      yPosition += 5;

      const sectionRows = sections.map(section => {
        const s = stats.bySection[section];
        const rate = s.total > 0 ? (((s.present + s.late) / s.total) * 100).toFixed(1) : '0.0';
        return [
          section,
          s.total,
          s.present,
          s.absent,
          s.late,
          s.excused,
          `${rate}%`
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Section', 'Total', 'Present', 'Absent', 'Late', 'Excused', 'Rate']],
        body: sectionRows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: { 6: { fontStyle: 'bold' } }
      });

      yPosition = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 20 : yPosition + 60;
    }

    // Student Performance Analysis Table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("Student Performance Analysis", 14, yPosition);
    yPosition += 5;

    // Calculate Distribution
    const studentStats = Object.values(stats.byStudent || {});
    const totalStudents = studentStats.length;

    if (totalStudents > 0) {
      const excellent = studentStats.filter(s => { const r = s.total > 0 ? ((s.present + s.late) / s.total) * 100 : 0; return r >= 95; }).length;
      const good = studentStats.filter(s => { const r = s.total > 0 ? ((s.present + s.late) / s.total) * 100 : 0; return r >= 85 && r < 95; }).length;
      const average = studentStats.filter(s => { const r = s.total > 0 ? ((s.present + s.late) / s.total) * 100 : 0; return r >= 75 && r < 85; }).length;
      const needsHelp = studentStats.filter(s => { const r = s.total > 0 ? ((s.present + s.late) / s.total) * 100 : 0; return r < 75; }).length;

      const performanceData = [
        ['Excellent (95%+)', excellent, `${((excellent / totalStudents) * 100).toFixed(1)}%`],
        ['Good (85-94%)', good, `${((good / totalStudents) * 100).toFixed(1)}%`],
        ['Average (75-84%)', average, `${((average / totalStudents) * 100).toFixed(1)}%`],
        ['Needs Help (<75%)', needsHelp, `${((needsHelp / totalStudents) * 100).toFixed(1)}%`]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Category', 'Count', 'Percentage']],
        body: performanceData,
        theme: 'grid',
        headStyles: { fillColor: [142, 68, 173] }, // Purple for analytics
      });
    }
  } catch (error) {
    console.error("Error generating general summary report:", error);
    doc.text("Error generating summary: " + error.message, 14, 200);
  }
};

// Generate filtered report based on frontend filters
const generateFilteredReport = async (req, res) => {
  try {
    const { filters, records } = req.body;

    // Detailed logging for debugging
    console.log('Received request for filtered report');
    if (records) {
      console.log(`Records count: ${records.length}`);
    } else {
      console.error('No records in request body');
    }

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: "No records to generate report from" });
    }

    // Detect if this is a student-specific search
    const searchTerm = filters && filters.searchTerm ? filters.searchTerm.trim() : "";
    const uniqueStudents = new Set();
    records.forEach(r => {
      if (r.student) {
        const sid = r.student._id ? (typeof r.student._id === 'object' ? r.student._id.toString() : r.student._id) : 'unknown';
        uniqueStudents.add(sid);
      }
    });

    const isSingleStudentReport = uniqueStudents.size === 1;

    console.log(`Generating report. Single student: ${isSingleStudentReport}, Unique: ${uniqueStudents.size}`);

    // Calculate statistics
    const stats = calculateAttendanceStats(records);

    // Create jsPDF instance
    const doc = new jsPDF();

    // Generate specific report layout
    if (isSingleStudentReport && searchTerm) {
      generateStudentDetailedReport(doc, records, stats, filters);
    } else {
      generateGeneralSummaryReport(doc, records, stats, filters);
    }

    const pdfBuffer = doc.output('arraybuffer');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('Filtered report generation error:', error);
    res.status(500).json({ success: false, message: "Failed to generate filtered report: " + error.message });
  }
};

// Generate PDF report (Legacy function used by older endpoints, updated to share same robust logic)
const generatePDFReport = (records, stats, filters = {}) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80); // Dark Blue
    doc.text("Attendance Report", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 10;

    // Report info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const reportDate = new Date().toLocaleDateString();
    doc.text(`Generated on: ${reportDate}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 20;

    // Filters applied
    if (filters.section || filters.date || filters.status) {
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text("Filters Applied:", 14, yPosition);
      yPosition += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (filters.section) { doc.text(`• Section: ${filters.section}`, 20, yPosition); yPosition += 6; }
      if (filters.date) { doc.text(`• Date: ${filters.date}`, 20, yPosition); yPosition += 6; }
      if (filters.status) { doc.text(`• Status: ${filters.status}`, 20, yPosition); yPosition += 6; }
      yPosition += 10;
    }

    // Overall Statistics Box
    doc.setDrawColor(200);
    doc.setFillColor(245, 247, 250);
    doc.rect(14, yPosition, 180, 45, 'FD');

    let statsY = yPosition + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("Overall Summary", 20, statsY);

    statsY += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);

    // Left column
    doc.text(`Total Records: ${stats.totalRecords}`, 20, statsY);
    doc.text(`Present: ${stats.present}`, 20, statsY + 6);
    doc.text(`Absent: ${stats.absent}`, 20, statsY + 12);

    // Right column
    doc.text(`Late: ${stats.late}`, 100, statsY);
    doc.text(`Excused: ${stats.excused}`, 100, statsY + 6);
    doc.setFont("helvetica", "bold");
    doc.text(`Attendance Rate: ${stats.attendancePercentage}%`, 100, statsY + 12);

    yPosition += 55;

    // Student Performance Table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("Student Performance", 14, yPosition);
    yPosition += 5;

    const tableColumn = ["Name", "Index", "Section", "Present", "Absent", "Late", "Rate %"];
    const tableRows = [];

    Object.keys(stats.byStudent).forEach(studentId => {
      const student = stats.byStudent[studentId];
      const studentData = [
        student.name,
        student.index,
        student.section,
        student.present,
        student.absent,
        student.late,
        student.attendancePercentage + "%"
      ];
      tableRows.push(studentData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: yPosition,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 40 }, // Name
        3: { halign: 'center' }, // Present
        4: { halign: 'center' }, // Absent
        5: { halign: 'center' }, // Late
        6: { halign: 'right', fontStyle: 'bold' } // Rate
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 20 },
    });

    return doc;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF: ' + error.message);
  }
};

// Main report generation endpoint
const generateAttendanceReport = async (req, res) => {
  try {
    const { section, date, status, format = 'pdf' } = req.query;

    // Build query
    let query = {};
    let populateQuery = { path: 'student' };

    // Apply filters
    if (section) {
      const students = await Student.find({ section });
      const studentIds = students.map(s => s._id);
      query.student = { $in: studentIds };
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (status) {
      query.status = status;
    }

    // Get records
    const records = await Attendance.find(query).populate('student').sort({ date: -1 });

    if (records.length === 0) {
      return res.status(404).json({ message: "No records found for the specified criteria" });
    }

    // Calculate statistics
    const stats = calculateAttendanceStats(records);

    // Generate report based on format
    if (format === 'pdf') {
      try {
        const doc = generatePDFReport(records, stats, { section, date, status });
        const pdfBuffer = doc.output('arraybuffer');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${new Date().toISOString().split('T')[0]}.pdf"`);
        res.send(Buffer.from(pdfBuffer));
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);
        return res.status(500).json({
          message: "Failed to generate PDF report",
          error: pdfError.message
        });
      }
    } else {
      // Return JSON data for other formats
      res.json({
        records,
        statistics: stats,
        filters: { section, date, status },
        generatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ message: "Error generating report", error: error.message });
  }
};

// Get available sections for filtering
const getAvailableSections = async (req, res) => {
  try {
    const sections = await Student.distinct('section');
    res.json({ sections: sections.sort() });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ message: "Error fetching sections", error: error.message });
  }
};

// Generate monthly attendance report
const generateMonthlyReport = async (req, res) => {
  try {
    const { year, month, section, format = 'pdf' } = req.query;

    if (!year || !month) {
      return res.status(400).json({ message: "Year and month are required" });
    }

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Build query
    let query = {
      date: { $gte: startDate, $lte: endDate }
    };

    // Apply section filter if provided
    if (section) {
      const students = await Student.find({ section });
      const studentIds = students.map(s => s._id);
      query.student = { $in: studentIds };
    }

    // Get records for the month
    const records = await Attendance.find(query).populate('student').sort({ date: 1 });

    if (records.length === 0) {
      return res.status(404).json({ message: "No records found for the specified month" });
    }

    // Calculate enhanced statistics
    const stats = calculateMonthlyStats(records, year, month);

    // Generate report based on format
    if (format === 'pdf') {
      try {
        const doc = generateMonthlyPDFReport(records, stats, { year, month, section });
        const pdfBuffer = doc.output('arraybuffer');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${year}-${month.toString().padStart(2, '0')}.pdf"`);
        res.send(Buffer.from(pdfBuffer));
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);
        return res.status(500).json({
          message: "Failed to generate PDF report",
          error: pdfError.message
        });
      }
    } else {
      // Return JSON data for other formats
      res.json({
        records,
        statistics: stats,
        filters: { year, month, section },
        generatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Monthly report generation error:', error);
    res.status(500).json({ message: "Error generating monthly report", error: error.message });
  }
};

// Calculate monthly statistics with trends
const calculateMonthlyStats = (records, year, month) => {
  const stats = {
    month: month,
    year: year,
    totalRecords: records.length,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendancePercentage: 0,
    byStudent: {},
    bySection: {},
    byDate: {},
    dailyTrends: [],
    weeklyTrends: [],
    topPerformers: [],
    attendanceIssues: []
  };

  // Calculate basic statistics
  records.forEach(record => {
    // Safety check
    if (!record || !record.student) return;

    const studentId = record.student._id ? (typeof record.student._id === 'object' ? record.student._id.toString() : record.student._id) : 'unknown';
    const section = record.student.section;
    const date = new Date(record.date).toISOString().split('T')[0];
    const dayOfWeek = new Date(record.date).getDay();

    // Count by status
    const status = record.status ? record.status.toLowerCase() : 'unknown';
    if (stats[status] !== undefined) stats[status]++;

    // Count by student
    if (!stats.byStudent[studentId]) {
      stats.byStudent[studentId] = {
        name: record.student.name,
        index: record.student.std_index,
        section: record.student.section,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        attendanceDays: new Set()
      };
    }
    const sStats = stats.byStudent[studentId];
    sStats.total++;
    if (sStats[status] !== undefined) sStats[status]++;
    sStats.attendanceDays.add(date);

    // Count by section
    if (!stats.bySection[section]) {
      stats.bySection[section] = {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
      };
    }
    const sectStats = stats.bySection[section];
    sectStats.total++;
    if (sectStats[status] !== undefined) sectStats[status]++;

    // Count by date
    if (!stats.byDate[date]) {
      stats.byDate[date] = {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        dayOfWeek: dayOfWeek
      };
    }
    const dStats = stats.byDate[date];
    dStats.total++;
    if (dStats[status] !== undefined) dStats[status]++;
  });

  // Calculate attendance percentage
  if (stats.totalRecords > 0) {
    stats.attendancePercentage = ((stats.present + stats.excused) / stats.totalRecords * 100).toFixed(2);
  }

  // Calculate individual student percentages and trends
  Object.keys(stats.byStudent).forEach(studentId => {
    const student = stats.byStudent[studentId];
    student.attendancePercentage = student.total > 0 ?
      ((student.present + student.excused) / student.total * 100).toFixed(2) : 0;
    student.attendanceDays = student.attendanceDays.size;
  });

  // Calculate section percentages
  Object.keys(stats.bySection).forEach(section => {
    const sectionStats = stats.bySection[section];
    sectionStats.attendancePercentage = sectionStats.total > 0 ?
      ((sectionStats.present + sectionStats.excused) / sectionStats.total * 100).toFixed(2) : 0;
  });

  // Calculate daily trends
  Object.keys(stats.byDate).forEach(date => {
    const dateStats = stats.byDate[date];
    const attendanceRate = dateStats.total > 0 ?
      ((dateStats.present + dateStats.excused) / dateStats.total * 100).toFixed(2) : 0;

    stats.dailyTrends.push({
      date: date,
      attendanceRate: parseFloat(attendanceRate),
      present: dateStats.present,
      absent: dateStats.absent,
      late: dateStats.late,
      excused: dateStats.excused,
      dayOfWeek: dateStats.dayOfWeek
    });
  });

  // Sort daily trends by date
  stats.dailyTrends.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate weekly trends
  const weeks = {};
  stats.dailyTrends.forEach(day => {
    const weekNumber = Math.ceil(new Date(day.date).getDate() / 7);
    if (!weeks[weekNumber]) {
      weeks[weekNumber] = { totalDays: 0, totalRate: 0, days: [] };
    }
    weeks[weekNumber].totalDays++;
    weeks[weekNumber].totalRate += parseFloat(day.attendanceRate);
    weeks[weekNumber].days.push(day);
  });

  Object.keys(weeks).forEach(week => {
    const weekData = weeks[week];
    stats.weeklyTrends.push({
      week: parseInt(week),
      averageAttendanceRate: (weekData.totalRate / weekData.totalDays).toFixed(2),
      days: weekData.days
    });
  });

  // Find top performers (students with 100% attendance)
  stats.topPerformers = Object.keys(stats.byStudent)
    .map(id => stats.byStudent[id])
    .filter(student => parseFloat(student.attendancePercentage) === 100)
    .sort((a, b) => b.attendanceDays - a.attendanceDays);

  // Find attendance issues (students with < 80% attendance)
  stats.attendanceIssues = Object.keys(stats.byStudent)
    .map(id => stats.byStudent[id])
    .filter(student => parseFloat(student.attendancePercentage) < 80)
    .sort((a, b) => parseFloat(a.attendancePercentage) - parseFloat(b.attendancePercentage));

  return stats;
};

// Generate monthly PDF report
const generateMonthlyPDFReport = (records, stats, filters = {}) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("Monthly Attendance Report", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 10;

    // Month and year
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`${monthNames[stats.month - 1]} ${stats.year}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 20;

    // Filters
    if (filters.section) {
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`Section: ${filters.section}`, 14, yPosition);
      yPosition += 10;
    }

    // Overall Statistics Box
    doc.setDrawColor(200);
    doc.setFillColor(245, 247, 250);
    doc.rect(14, yPosition, 180, 50, 'FD');

    let statsY = yPosition + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("Monthly Summary", 20, statsY);

    statsY += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);

    // Left
    doc.text(`Total Records: ${stats.totalRecords}`, 20, statsY);
    doc.text(`Present: ${stats.present}`, 20, statsY + 6);
    doc.text(`Absent: ${stats.absent}`, 20, statsY + 12);

    // Right
    doc.text(`Late: ${stats.late}`, 100, statsY);
    doc.text(`Excused: ${stats.excused}`, 100, statsY + 6);
    doc.setFont("helvetica", "bold");
    doc.text(`Overall Rate: ${stats.attendancePercentage}%`, 100, statsY + 12);

    yPosition += 60;

    // Weekly Trends Table
    if (stats.weeklyTrends.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 62, 80);
      doc.text("Weekly Trends", 14, yPosition);

      const weeklyRows = stats.weeklyTrends.map(week => [
        `Week ${week.week}`,
        `${week.averageAttendanceRate}%`
      ]);

      autoTable(doc, {
        head: [["Week", "Average Attendance"]],
        body: weeklyRows,
        startY: yPosition + 5,
        theme: 'grid',
        headStyles: { fillColor: [46, 204, 113], halign: 'center' }, // Green for trends
        columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // Top Performers Table
    if (stats.topPerformers.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 62, 80);
      doc.text("Top Performers (100% Attendance)", 14, yPosition);

      const performerRows = stats.topPerformers.slice(0, 10).map(s => [
        s.name,
        s.index,
        s.attendanceDays.toString()
      ]);

      autoTable(doc, {
        head: [["Name", "Index", "Days Present"]],
        body: performerRows,
        startY: yPosition + 5,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219] },
        margin: { left: 14, right: 14 }
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // Attendance Issues Table
    if (stats.attendanceIssues.length > 0) {
      // Check for page break
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(192, 57, 43); // Red for issues
      doc.text("Students Needing Attention (< 80%)", 14, yPosition);

      const issueRows = stats.attendanceIssues.slice(0, 10).map(s => [
        s.name,
        s.index,
        `${s.attendancePercentage}%`
      ]);

      autoTable(doc, {
        head: [["Name", "Index", "Attendance Rate"]],
        body: issueRows,
        startY: yPosition + 5,
        theme: 'grid',
        headStyles: { fillColor: [231, 76, 60] },
        columnStyles: { 2: { fontStyle: 'bold', textColor: [192, 57, 43] } },
        margin: { left: 14, right: 14 }
      });
    }

    return doc;
  } catch (error) {
    console.error('Monthly PDF generation error:', error);
    throw new Error('Failed to generate monthly PDF: ' + error.message);
  }
};

// Generate individual student report
const generateStudentReport = async (req, res) => {
  try {
    const { studentId, std_index } = req.query;

    if (!studentId && !std_index) {
      return res.status(400).json({ message: "Provide studentId or std_index" });
    }

    // Find student
    let student;
    if (studentId) {
      student = await Student.findById(studentId);
    } else {
      student = await Student.findOne({ std_index });
    }

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get student's attendance records
    const records = await Attendance.find({ student: student._id })
      .populate('student')
      .sort({ date: -1 });

    if (records.length === 0) {
      return res.status(404).json({ message: "No attendance records found for this student" });
    }

    // Calculate statistics for this student
    const stats = calculateAttendanceStats(records);

    // Generate PDF report
    try {
      const doc = generateStudentPDFReport(student, records, stats);
      const pdfBuffer = doc.output('arraybuffer');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="student-report-${student.std_index}-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.send(Buffer.from(pdfBuffer));
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      return res.status(500).json({
        message: "Failed to generate PDF report",
        error: pdfError.message
      });
    }
  } catch (error) {
    console.error('Student report generation error:', error);
    res.status(500).json({ message: "Error generating student report", error: error.message });
  }
};

// Generate individual student PDF report
const generateStudentPDFReport = (student, records, stats) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("Student Attendance Report", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 20;

    // Student Info Box
    doc.setDrawColor(200);
    doc.setFillColor(248, 249, 250);
    doc.rect(14, yPosition, 180, 50, 'FD');

    let infoY = yPosition + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Student Profile", 20, infoY);

    infoY += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);

    doc.text(`Name: ${student.name}`, 20, infoY);
    doc.text(`Index: ${student.std_index}`, 110, infoY);

    infoY += 8;
    doc.text(`Section: ${student.section}`, 20, infoY);
    doc.text(`Overall Rate: ${stats.attendancePercentage}%`, 110, infoY);

    infoY += 8;
    doc.text(`Parent: ${student.parentName}`, 20, infoY);
    doc.text(`Phone: ${student.parentPhoneNum}`, 110, infoY);

    yPosition += 60;

    // Summary Stats
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("Attendance Summary", 14, yPosition);
    yPosition += 8;

    const summaryData = [[
      `${stats.totalRecords}`,
      `${stats.present}`,
      `${stats.absent}`,
      `${stats.late}`,
      `${stats.excused}`
    ]];

    autoTable(doc, {
      head: [["Total Days", "Present", "Absent", "Late", "Excused"]],
      body: summaryData,
      startY: yPosition,
      theme: 'plain',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [100, 100, 100],
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: { bottom: 0.5 },
        lineColor: [200, 200, 200]
      },
      bodyStyles: {
        halign: 'center',
        fontSize: 12,
        fontStyle: 'bold'
      },
      margin: { left: 14, right: 14 }
    });

    yPosition = doc.lastAutoTable.finalY + 20;

    // Attendance Records Table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("Attendance History", 14, yPosition);

    const recordRows = records.map(record => [
      new Date(record.date).toLocaleDateString(),
      record.status,
      record.notifiedParent ? "Yes" : "No"
    ]);

    autoTable(doc, {
      head: [["Date", "Status", "Parent Notified"]],
      body: recordRows,
      startY: yPosition + 5,
      theme: 'striped',
      headStyles: { fillColor: [52, 73, 94] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: {
          fontStyle: 'bold',
          cellWidth: 60
        }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'Present') {
            data.cell.styles.textColor = [46, 204, 113];
          } else if (data.cell.raw === 'Absent') {
            data.cell.styles.textColor = [231, 76, 60];
          } else if (data.cell.raw === 'Late') {
            data.cell.styles.textColor = [241, 196, 15];
          }
        }
      }
    });

    return doc;
  } catch (error) {
    console.error('Student PDF generation error:', error);
    throw new Error('Failed to generate student PDF: ' + error.message);
  }
};

module.exports = {
  generateAttendanceReport,
  getAvailableSections,
  generateStudentReport,
  generateMonthlyReport,
  generateFilteredReport
};
