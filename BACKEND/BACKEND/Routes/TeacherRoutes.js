const express = require("express");
const router = express.Router();
const TeacherController = require("../Controllers/TeacherController");
const multer = require("multer");

// Configure Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    }
});
const upload = multer({ storage: storage });

router.get("/", TeacherController.getTeachers);
router.get("/next-id", TeacherController.getNextTeacherId);
router.post("/", upload.single("profilePic"), TeacherController.addTeacher);
router.put("/:id", upload.single("profilePic"), TeacherController.updateTeacher);
router.post("/login", TeacherController.loginTeacher);
router.delete("/:id", TeacherController.deleteTeacher);

module.exports = router;
