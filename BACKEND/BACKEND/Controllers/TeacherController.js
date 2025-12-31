const Teacher = require("../Model/TeacherModel");
const Student = require("../Model/StudentModel");
const nodemailer = require("nodemailer");

// Email Helper
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

// Generate Random Password
const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Add a new teacher
const addTeacher = async (req, res, next) => {
    const userRole = req.headers["x-user-role"];

    if (userRole === "Teacher") {
        return res.status(403).json({ message: "Forbidden: Teachers cannot add other teachers" });
    }

    const { name, subject, email, phone } = req.body;
    let teacher;

    try {
        // Check if email exists in Teacher collection
        const existingTeacher = await Teacher.findOne({ email });
        if (existingTeacher) {
            return res.status(409).json({ message: "cant add teacher: Email already exists in Teacher list", code: "DUPLICATE_EMAIL" });
        }

        // Check if email exists in Student collection (Strict Unique Check)
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(409).json({ message: "cant add teacher: Email already exists in Student list", code: "DUPLICATE_EMAIL_STUDENT" });
        }

        // Generate Teacher ID
        const lastTeacher = await Teacher.findOne().sort({ createdAt: -1 });
        let newId = "TCH001";

        if (lastTeacher && lastTeacher.teacherId) {
            const lastIdNum = parseInt(lastTeacher.teacherId.replace("TCH", ""));
            if (!isNaN(lastIdNum)) {
                newId = `TCH${String(lastIdNum + 1).padStart(3, "0")}`;
            }
        }

        const password = generatePassword();

        teacher = new Teacher({
            name,
            teacherId: newId,
            subject,
            email,
            phone,
            password, // Save generated password
            profilePic: req.file ? req.file.path : null
        });
        await teacher.save();

        // Send Email with Credentials
        await sendEmail({
            to: email,
            subject: "Your Teacher Account Credentials - CMB Smart Alert",
            text: `Welcome to CMB International College Smart Alert System.\n\nYour account has been created.\n\nLogin Credentials:\nUser ID: ${newId}\nPassword: ${password}\n\nPlease keep this information secure.`
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Unable to add teacher" });
    }

    if (!teacher) {
        return res.status(500).json({ message: "Unable to add teacher" });
    }
    return res.status(201).json({ teacher });
};

// Teacher Login
const loginTeacher = async (req, res, next) => {
    const { userId, password } = req.body; // userId is now expected to be teacherId

    try {
        // Teacher logs in with Teacher ID
        const teacher = await Teacher.findOne({ teacherId: userId });

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        if (teacher.password !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        return res.status(200).json({ message: "Login successful", teacher });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Login failed" });
    }
};

// Get all teachers
const getTeachers = async (req, res, next) => {
    let teachers;
    try {
        teachers = await Teacher.find();
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Unable to get teachers" });
    }

    if (!teachers) {
        return res.status(404).json({ message: "No teachers found" });
    }
    return res.status(200).json({ teachers });
};

// Delete teacher
const deleteTeacher = async (req, res, next) => {
    const id = req.params.id;
    const userRole = req.headers["x-user-role"];

    if (userRole === "Teacher") {
        return res.status(403).json({ message: "Forbidden: Teachers cannot delete other teachers" });
    }

    let teacher;
    try {
        teacher = await Teacher.findByIdAndDelete(id);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Unable to delete teacher" });
    }

    if (!teacher) {
        return res.status(404).json({ message: "Unable to delete teacher" });
    }
    return res.status(200).json({ message: "Teacher successfully deleted" });
};

const getNextTeacherId = async (req, res, next) => {
    try {
        const lastTeacher = await Teacher.findOne().sort({ createdAt: -1 });
        let nextId = "TCH001";

        if (lastTeacher && lastTeacher.teacherId) {
            const lastIdNum = parseInt(lastTeacher.teacherId.replace("TCH", ""));
            if (!isNaN(lastIdNum)) {
                nextId = `TCH${String(lastIdNum + 1).padStart(3, "0")}`;
            }
        }

        return res.status(200).json({ nextId });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Unable to generate ID" });
    }
};

// Update Teacher
const updateTeacher = async (req, res, next) => {
    const id = req.params.id;
    const userRole = req.headers["x-user-role"];

    if (userRole === "Teacher") {
        return res.status(403).json({ message: "Forbidden: Teachers cannot update teacher details" });
    }

    const { name, subject, email, phone } = req.body;
    let teacher;

    try {
        teacher = await Teacher.findById(id);
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        teacher.name = name || teacher.name;
        teacher.subject = subject || teacher.subject;

        // If email is changing, check for uniqueness
        if (email && email !== teacher.email) {
            const existingTeacher = await Teacher.findOne({ email });
            if (existingTeacher) {
                return res.status(409).json({ message: "cant add teacher: Email already exists in Teacher list" });
            }
            const existingStudent = await Student.findOne({ email });
            if (existingStudent) {
                return res.status(409).json({ message: "cant add teacher: Email already exists in Student list" });
            }
            teacher.email = email;
        }

        teacher.phone = phone || teacher.phone;

        if (req.file) {
            teacher.profilePic = req.file.path;
        }

        await teacher.save();
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Unable to update teacher" });
    }

    return res.status(200).json({ message: "Teacher successfully updated", teacher });
};

exports.addTeacher = addTeacher;
exports.getTeachers = getTeachers;
exports.deleteTeacher = deleteTeacher;
exports.loginTeacher = loginTeacher;
exports.getNextTeacherId = getNextTeacherId;
exports.updateTeacher = updateTeacher;
