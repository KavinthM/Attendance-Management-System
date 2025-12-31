const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const attendanceSchema = new Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StudentModel",
    required: true
  },
  // IMPORTANT: store date normalized to midnight to ensure uniqueness works
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ["Present", "Absent", "Late", "Excused"],
    default: "Present"
  },
  justification: {
    type: String,
    default: ""
  },
  notifiedParent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enforce one record per student per day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("AttendanceModel", attendanceSchema);