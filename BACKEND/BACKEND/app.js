const express = require("express");
const mongoose = require("mongoose");
const attendanceRoutes = require("./Routes/AttendanceRoutes");
const reportRoutes = require("./Routes/ReportRoutes");
const studentRoutes = require("./Routes/StudentRoutes");
const leaveRequestRoutes = require("./Routes/LeaveRequestRoutes");
const notificationRoutes = require("./Routes/NotificationRoutes");
const teacherRoutes = require("./Routes/TeacherRoutes");
const cors = require("cors");
require("dotenv").config(); // Add this line
const app = express();

//  Apply middleware BEFORE routes
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001"], credentials: true }));
app.use(express.json());

// Mount routes after middleware
app.use("/students", studentRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/reports", reportRoutes);
app.use("/leave-requests", leaveRequestRoutes);
app.use("/notifications", notificationRoutes);
app.use("/teachers", teacherRoutes);
// Serve uploaded files
app.use("/uploads", express.static("uploads"));

//Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://Admin:n3AK0A9ujJWgb9dD@cluster0.rejzequ.mongodb.net/smart-alert-db";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.log(err.message));