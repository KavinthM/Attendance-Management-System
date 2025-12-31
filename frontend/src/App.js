import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Students from "./pages/Students";
import AddStudent from "./pages/AddStudent";
import Attendance from "./pages/Attendance";
import AttendanceRecords from "./pages/AttendanceRecords";
import ParentView from "./pages/ParentView";
import Teachers from "./pages/Teachers";
import AddTeacher from "./pages/AddTeacher";
import EditTeacher from "./pages/EditTeacher";
import './index.css';

const App = () => {
  return (
    <div className="fade-in">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/students" element={<Students />} />
        <Route path="/students/add" element={<AddStudent />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/teachers/add" element={<AddTeacher />} />
        <Route path="/teachers/edit/:id" element={<EditTeacher />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/records" element={<AttendanceRecords />} />
        <Route path="/parent-view" element={<ParentView />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
