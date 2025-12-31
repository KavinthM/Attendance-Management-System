const Notification = require("../Model/NotificationModel");
const Student = require("../Model/StudentModel");

// Create a new notification
const createNotification = async (req, res) => {
  const { studentId, title, message, type, date } = req.body;

  if (!studentId || !title || !message || !date) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const notification = new Notification({
      studentId,
      title,
      message,
      type: type || "general",
      date: new Date(date),
    });

    await notification.save();
    return res.status(201).json({ 
      message: "Notification created successfully",
      notification 
    });
  } catch (err) {
    console.error("Error creating notification:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get notifications for a specific student
const getNotificationsByStudentIndex = async (req, res) => {
  const { studentIndex } = req.query;

  if (!studentIndex) {
    return res.status(400).json({ message: "Student index is required" });
  }

  try {
    // Find student by index
    const student = await Student.findOne({ std_index: studentIndex.trim() });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get notifications for this student
    const notifications = await Notification.find({ studentId: student._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({ notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get unread notification count for a student
const getUnreadCount = async (req, res) => {
  const { studentIndex } = req.query;

  if (!studentIndex) {
    return res.status(400).json({ message: "Student index is required" });
  }

  try {
    const student = await Student.findOne({ std_index: studentIndex.trim() });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const count = await Notification.countDocuments({ 
      studentId: student._id,
      isRead: false 
    });

    return res.status(200).json({ count });
  } catch (err) {
    console.error("Error fetching unread count:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({ 
      message: "Notification marked as read",
      notification 
    });
  } catch (err) {
    console.error("Error marking notification as read:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Mark all notifications as read for a student
const markAllAsRead = async (req, res) => {
  const { studentIndex } = req.body;

  if (!studentIndex) {
    return res.status(400).json({ message: "Student index is required" });
  }

  try {
    const student = await Student.findOne({ std_index: studentIndex.trim() });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await Notification.updateMany(
      { studentId: student._id, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Error marking all as read:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createNotification,
  getNotificationsByStudentIndex,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
