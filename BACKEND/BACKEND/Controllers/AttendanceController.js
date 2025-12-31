const Attendance = require("../Model/AttendanceModel");
const Student = require("../Model/StudentModel");
const Notification = require("../Model/NotificationModel");

// Helper: check if string looks like a Mongo ObjectId
const looksLikeObjectId = (s) => typeof s === "string" && s.match(/^[0-9a-fA-F]{24}$/);

// Normalize any Date to midnight (local time)
const normalizeToMidnight = (d) => {
  const dt = new Date(d || Date.now());
  dt.setHours(0, 0, 0, 0);
  return dt;
};

// Get all attendance (sorted newest first)
const getAllAttendance = async (req, res) => {
  const { section } = req.query;
  try {
    let query = {};
    if (section) {
      // Find students in this section first
      const studentsInSection = await Student.find({ section }).select("_id");
      const studentIds = studentsInSection.map(s => s._id);
      query.student = { $in: studentIds };
    }
    const records = await Attendance.find(query).populate("student").sort({ date: -1, _id: -1 });
    return res.status(200).json({ records });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Mark attendance by studentId or std_index
const markAttendance = async (req, res) => {
  const { studentId, std_index, date, status, notifiedParent } = req.body;

  if (!studentId && !std_index) {
    return res.status(400).json({ message: "Provide studentId or std_index" });
  }

  try {
    let student;
    if (studentId) {
      if (!looksLikeObjectId(studentId)) return res.status(400).json({ message: "Invalid studentId" });
      student = await Student.findById(studentId);
    } else {
      student = await Student.findOne({ std_index });
    }
    if (!student) return res.status(404).json({ message: "Student not found" });

    const day = normalizeToMidnight(date);

    // Enforce 1 mark per student per day
    const existing = await Attendance.findOne({ student: student._id, date: day });
    if (existing) {
      return res.status(409).json({ message: "Attendance already marked for this student on this date" });
    }

    const record = new Attendance({
      student: student._id,
      date: day,
      status: status || "Present",
      notifiedParent: Boolean(notifiedParent)
    });

    await record.save();

    const populated = await Attendance.findById(record._id).populate("student");
    return res.status(200).json({ record: populated });
  } catch (err) {
    // Handle duplicate-key errors from the unique index
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Attendance already marked for this student on this date" });
    }
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get attendance by studentId or std_index
const getAttendanceByStudent = async (req, res) => {
  const param = req.params.studentId;
  try {
    let student;
    if (looksLikeObjectId(param)) {
      student = await Student.findById(param);
    } else {
      student = await Student.findOne({ std_index: param });
    }
    if (!student) return res.status(404).json({ message: "Student not found" });

    const records = await Attendance.find({ student: student._id }).populate("student").sort({ date: -1, _id: -1 });
    return res.status(200).json({ records });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update attendance by attendance _id
const updateAttendance = async (req, res) => {
  const id = req.params.id;
  const { status, justification, notifiedParent, date } = req.body;

  try {
    const update = {};
    if (status) update.status = status;
    if (typeof justification !== "undefined") update.justification = justification;
    if (typeof notifiedParent !== "undefined") update.notifiedParent = notifiedParent;
    if (date) update.date = normalizeToMidnight(date);

    // If date is being changed, we rely on the unique index to prevent collisions
    const record = await Attendance.findByIdAndUpdate(id, update, { new: true, runValidators: true }).populate("student");
    if (!record) return res.status(404).json({ message: "Attendance not found" });
    return res.status(200).json({ record });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Another record already exists for this student and date" });
    }
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete attendance
const deleteAttendance = async (req, res) => {
  const id = req.params.id;
  try {
    const record = await Attendance.findByIdAndDelete(id);
    if (!record) return res.status(404).json({ message: "Attendance not found" });
    return res.status(200).json({ record });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const twilio = require("twilio");

const sendWhatsApp = async ({ to, body }) => {
  try {
    console.log("Sending WhatsApp to:", to);
    console.log("Using Twilio Account SID:", process.env.TWILIO_ACCOUNT_SID);
    console.log("From number:", process.env.TWILIO_WHATSAPP_FROM);

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      body
    });

    console.log("WhatsApp sent successfully:", result.sid);
    return result;
  } catch (error) {
    console.error("WhatsApp send error:", error.message);
    console.error("Error details:", error);
    throw error;
  }
};

const nodemailer = require("nodemailer");

const sendSMS = async ({ to, body }) => {
  try {
    if (!process.env.TWILIO_PHONE_NUMBER) {
      console.warn("TWILIO_PHONE_NUMBER not set in .env. Skipping SMS.");
      return null;
    }

    // ... (rest of sendSMS logic if needed, but I can keep it or rewrite it. I'll rewrite to be safe and clean)
    console.log("Sending SMS to:", to);
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const result = await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
      body
    });

    console.log("SMS sent successfully:", result.sid);
    return result;
  } catch (error) {
    console.error("Failed to send SMS:", error.message);
    return null;
  }
};

const sendEmail = async ({ to, subject, text }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("EMAIL_USER or EMAIL_PASS not set in .env. Skipping Email.");
      return null;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    };

    console.log(`Sending Email to: ${to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send Email:", error.message);
    return null;
  }
};

const normalizeParentNumber = (raw) => {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const cleaned = trimmed.replace(/[^\d+]/g, '');
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) {
    const cc = process.env.DEFAULT_PHONE_COUNTRY_CODE || "+94";
    return `${cc}${cleaned.substring(1)}`;
  }
  const cc = process.env.DEFAULT_PHONE_COUNTRY_CODE || "+94";
  return `${cc}${cleaned}`;
};

// Helper to send absent notification
const sendAbsentNotification = async (student, date, status) => {
  try {
    const phone = normalizeParentNumber(student.parentPhoneNum);
    const email = student.email;

    const day = new Date(date || Date.now());
    const formattedDate = new Date(day.getTime() - (day.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 10);

    const message =
      `🎓 CMB International College - Smart Alert\n\n` +
      `📅 Date: ${formattedDate}\n` +
      `👤 Student: ${student.name}\n` +
      `🆔 Index: ${student.std_index}\n` +
      `📚 Class: ${student.section}\n` +
      `📊 Status: ${status}\n\n` +
      `This is an automated notification from the school attendance system.`;

    console.log(`Sending notifications for ${student.name}...`);
    console.log(`Phone: ${phone}, Email: ${email}`);

    const promises = [];

    // Add WhatsApp
    if (phone) promises.push(sendWhatsApp({ to: phone, body: message }));
    else console.warn(`No valid phone for ${student.name}, skipping WhatsApp.`);

    // Add SMS
    if (phone) promises.push(sendSMS({ to: phone, body: message }));
    else console.warn(`No valid phone for ${student.name}, skipping SMS.`);

    // Add Email
    if (email) {
      promises.push(sendEmail({
        to: email,
        subject: `Attendance Alert: ${student.name} - ${status}`,
        text: message
      }));
    } else {
      console.warn(`No email for ${student.name}, skipping Email.`);
    }

    const results = await Promise.allSettled(promises);

    // Analyze results (Index mapping depends on push order, but simple success check is enough for now)
    // We basically want at least ONE channel to succeed.
    const hasSuccess = results.some(r => r.status === 'fulfilled' && r.value !== null);

    if (!hasSuccess) {
      console.error(`All notification channels failed/skipped for ${student.name}`);
      return false;
    }

    console.log(`Notification sequence completed for ${student.name}. Success: ${hasSuccess}`);

    // Create notification record (only once if any succeeded)
    await Notification.create({
      studentId: student._id,
      title: `${status} Alert`,
      message: `Your child ${student.name} was marked as ${status} on ${formattedDate}.`,
      type: status === "Absent" ? "absence" : "late",
      date: day
    });

    return true;
  } catch (err) {
    console.error(`Failed to send notification to ${student.name}:`, err.message);
    return false;
  }
};

// POST /attendance/notify-parents
// Body: { items: [{ studentId, status, date }] }
const notifyParentsForAbsents = async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "items required" });
  }

  try {
    // Fetch students in one go
    const ids = items.map((i) => i.studentId).filter(Boolean);
    const students = await Student.find({ _id: { $in: ids } });

    const idToStudent = new Map(students.map((s) => [String(s._id), s]));
    const results = await Promise.allSettled(
      items.map(async (i) => {
        const student = idToStudent.get(String(i.studentId));
        if (!student) {
          console.error("Student not found for ID:", i.studentId);
          throw new Error("Student not found");
        }

        console.log("Processing notification for student:", student.name);
        console.log("Raw parent phone number:", student.parentPhoneNum);

        const phone = normalizeParentNumber(student.parentPhoneNum);
        console.log("Normalized phone number:", phone);

        if (!phone) {
          console.error("Invalid parent phone number for student:", student.name);
          throw new Error("Invalid parent phone number");
        }

        const day = new Date(i.date || Date.now());
        const formattedDate = new Date(day.getTime() - (day.getTimezoneOffset() * 60000))
          .toISOString()
          .slice(0, 10);

        const message =
          `🎓 CMB International College - Smart Alert\n\n` +
          `📅 Date: ${formattedDate}\n` +
          `👤 Student: ${student.name}\n` +
          `🆔 Index: ${student.std_index}\n` +
          `📚 Class: ${student.section}\n` +
          `📊 Status: ${i.status}\n\n` +
          `This is an automated notification from the school attendance system.`;

        await sendWhatsApp({ to: phone, body: message });

        if (student.email) {
          await sendEmail({
            to: student.email,
            subject: `Attendance Alert: ${student.name} - ${i.status}`,
            text: message
          });
        } else {
          console.warn(`No email found for student ${student.name}, skipping email notification.`);
        }

        // Create notification for parent view
        await Notification.create({
          studentId: i.studentId,
          title: `${i.status} Alert`,
          message: `Your child ${student.name} was marked as ${i.status} on ${formattedDate}. Please contact the school if you have any questions.`,
          type: i.status === "Absent" ? "absence" : "late",
          date: new Date(i.date || Date.now())
        });

        return { studentId: i.studentId, success: true };
      })
    );

    const succeeded = [];
    const failed = [];
    results.forEach((r, idx) => {
      const sid = items[idx].studentId;
      if (r.status === "fulfilled") {
        succeeded.push(sid);
      } else {
        failed.push({ studentId: sid, error: r.reason?.message || "Failed" });
      }
    });

    return res.status(200).json({ succeeded, failed });
  } catch (err) {
    console.error("WhatsApp notification error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get attendance by student index number

const getAttendanceByStudentIndex = async (req, res) => {
  const { studentIndex } = req.body;

  if (!studentIndex) {
    return res.status(400).json({ message: "Student index is required" });
  }

  try {
    console.log("Looking up attendance for student index:", studentIndex);

    // Find student by index number
    const student = await Student.findOne({ std_index: studentIndex.trim() });

    if (!student) {
      return res.status(404).json({ message: "Student not found with this index number" });
    }

    console.log(`Found student: ${student.name}`);

    // Get attendance records for the student
    const records = await Attendance.find({ student: student._id })
      .populate("student")
      .sort({ date: -1, _id: -1 });

    // Get today's records
    const today = normalizeToMidnight(new Date());
    const todayRecords = records.filter(r =>
      r.date.getTime() === today.getTime()
    );

    return res.status(200).json({
      students: [student],
      allRecords: records,
      todayRecords,
      message: `Found student and ${records.length} attendance record(s)`
    });
  } catch (err) {
    console.error("Error in getAttendanceByStudentIndex:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAllAttendance,
  markAttendance,
  getAttendanceByStudent,
  updateAttendance,
  deleteAttendance,
  notifyParentsForAbsents,
  getAttendanceByStudentIndex
};

