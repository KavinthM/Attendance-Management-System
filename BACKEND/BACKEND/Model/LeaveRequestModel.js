const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const leaveRequestSchema = new Schema({
    studentIndex: {
        type: String,
        required: true,
    },
    studentName: {
        type: String,
        required: true,
    },
    parentPhone: {
        type: String,
        required: true,
    },
    leaveDate: {
        type: Date,
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
    documentPath: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
    },
    reviewedBy: {
        type: String,
        default: null,
    },
    reviewedAt: {
        type: Date,
        default: null,
    },
    rejectionReason: {
        type: String,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
