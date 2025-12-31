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

// Helper: check if string looks like a Mongo ObjectId
const looksLikeObjectId = (s) => typeof s === "string" && s.match(/^[0-9a-fA-F]{24}$/);

// Get all students
const getAllStudents = async (req, res) => {
  const { section } = req.query;
  try {
    let query = {};
    if (section) {
      query.section = section;
    }
    const students = await Student.find(query).sort({ name: 1 });
    return res.status(200).json({ students });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Add a new student
const addStudent = async (req, res) => {
  const userRole = req.headers["x-user-role"];

  if (userRole === "Teacher") {
    return res.status(403).json({ message: "Forbidden: Teachers cannot add students" });
  }

  let { name, section, parentName, parentPhoneNum, email, isSibling } = req.body;

  if (!name || !section || !parentName || !parentPhoneNum || !email) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Sanitize phone number (remove spaces)
  parentPhoneNum = parentPhoneNum.replace(/\s+/g, "");

  // Handle isSibling (FormData sends boolean as string)
  const isSiblingBool = isSibling === "true" || isSibling === true;

  try {
    // Check for duplicate email or phone manually if NOT a sibling
    if (!isSiblingBool) {
      const existingEmail = await Student.findOne({ email });
      if (existingEmail) {
        return res.status(409).json({ message: "Student with this email already exists. Is this a sibling?" });
      }

      const existingPhone = await Student.findOne({ parentPhoneNum });
      if (existingPhone) {
        return res.status(409).json({ message: "Student with this phone number already exists. Is this a sibling?" });
      }
    }

    // Auto-generate Index Number
    const lastStudent = await Student.findOne().sort({ std_index: -1 });
    let newIndex = "S0001";

    if (lastStudent && lastStudent.std_index) {
      const lastNum = parseInt(lastStudent.std_index.substring(1));
      if (!isNaN(lastNum)) {
        newIndex = `S${(lastNum + 1).toString().padStart(4, "0")}`;
      }
    }

    const password = generatePassword();

    const student = new Student({
      name,
      std_index: newIndex,
      section,
      parentName,
      parentPhoneNum,
      email,
      password, // Save generated password
      profilePic: req.file ? req.file.path : null
    });

    await student.save();

    // Send Email with Credentials
    await sendEmail({
      to: email,
      subject: "Parent Portal Access - CMB Smart Alert",
      text: `Welcome to CMB International College Smart Alert System.\n\nYour child ${name} has been registered.\n\nParent Portal Credentials:\nUser ID: ${newIndex}\nPassword: ${password}\n\nPlease use these credentials to log in as a Parent.`
    });

    return res.status(201).json({ student });
  } catch (err) {
    if (err.code === 11000) {
      // Check which field caused duplicate error (Mainly for index now)
      if (err.message.includes("std_index")) {
        return res.status(409).json({ message: "Student with this index number already exists" });
      }
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get student by ID or index
const getStudentByIdOrIndex = async (req, res) => {
  const param = req.params.id;

  try {
    let student;
    if (looksLikeObjectId(param)) {
      student = await Student.findById(param);
    } else {
      student = await Student.findOne({ std_index: param });
    }

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json({ student });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Login Parent
const loginParent = async (req, res) => {
  const { userId, password } = req.body; // userId is student index

  try {
    const student = await Student.findOne({ std_index: userId });
    if (!student) {
      return res.status(404).json({ message: "Student Index not found" });
    }

    if (student.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.status(200).json({ message: "Login successful", student });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Login failed" });
  }
};

// Update student
const updateStudent = async (req, res) => {
  const id = req.params.id;
  const userRole = req.headers["x-user-role"];

  if (userRole === "Teacher") {
    return res.status(403).json({ message: "Forbidden: Teachers cannot update student details" });
  }

  let { name, std_index, section, parentName, parentPhoneNum, email } = req.body;

  // Sanitize phone if present
  if (parentPhoneNum) {
    parentPhoneNum = parentPhoneNum.replace(/\s+/g, "");
  }

  try {
    const update = {};
    if (name) update.name = name;
    if (std_index) update.std_index = std_index;
    if (section) update.section = section;
    if (parentName) update.parentName = parentName;
    if (parentPhoneNum) update.parentPhoneNum = parentPhoneNum;
    if (email) update.email = email;
    if (req.file) update.profilePic = req.file.path;

    const student = await Student.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json({ student });
  } catch (err) {
    if (err.code === 11000) {
      if (err.message.includes("email")) {
        return res.status(409).json({ message: "Student with this email already exists" });
      }
      return res.status(409).json({ message: "Student with this index number already exists" });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  const id = req.params.id;
  const userRole = req.headers["x-user-role"];

  if (userRole === "Teacher") {
    return res.status(403).json({ message: "Forbidden: Teachers cannot delete students" });
  }

  try {
    let student;
    if (looksLikeObjectId(id)) {
      student = await Student.findByIdAndDelete(id);
    } else {
      student = await Student.findOneAndDelete({ std_index: id });
    }

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json({ student });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get next available student index
const getNextIndex = async (req, res) => {
  try {
    const lastStudent = await Student.findOne().sort({ std_index: -1 });
    let nextIndex = "S0001";

    if (lastStudent && lastStudent.std_index) {
      const lastNum = parseInt(lastStudent.std_index.substring(1));
      if (!isNaN(lastNum)) {
        nextIndex = `S${(lastNum + 1).toString().padStart(4, "0")}`;
      }
    }
    return res.status(200).json({ nextIndex });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAllStudents,
  addStudent,
  getStudentByIdOrIndex,
  updateStudent,
  deleteStudent,
  getNextIndex,
  loginParent
};