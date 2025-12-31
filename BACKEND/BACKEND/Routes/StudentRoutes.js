const express = require("express");
const router = express.Router();
const StudentController = require("../Controllers/StudentController");
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

router.get("/next-index", StudentController.getNextIndex);
router.get("/", StudentController.getAllStudents);
router.post("/", upload.single("profilePic"), StudentController.addStudent);
router.get("/:id", StudentController.getStudentByIdOrIndex);
router.post("/login", StudentController.loginParent);
router.put("/:id", upload.single("profilePic"), StudentController.updateStudent);
router.delete("/:id", StudentController.deleteStudent);

module.exports = router;
