const express = require("express");
const router = express.Router();
const NotificationController = require("../Controllers/NotificationController");

router.post("/", NotificationController.createNotification);
router.get("/student", NotificationController.getNotificationsByStudentIndex);
router.get("/unread-count", NotificationController.getUnreadCount);
router.put("/:id/read", NotificationController.markAsRead);
router.put("/mark-all-read", NotificationController.markAllAsRead);

module.exports = router;
