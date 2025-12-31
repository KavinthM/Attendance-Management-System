import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout";
import StudentForm from "../Components/StudentForm";
import { addStudent, getNextStudentIndex } from "../api/client";

const AddStudent = () => {
    const navigate = useNavigate();
    const [adding, setAdding] = useState(false);
    const [nextIndex, setNextIndex] = useState("");

    const userRole = localStorage.getItem("userRole");

    React.useEffect(() => {
        if (userRole === "Teacher") {
            navigate("/students");
        } else if (userRole === "Parent") {
            navigate("/parent-view");
        }
    }, [userRole, navigate]);

    React.useEffect(() => {
        getNextStudentIndex().then(({ data }) => setNextIndex(data.nextIndex)).catch(console.error);
    }, []);

    const handleAdd = async (payload, reset) => {
        setAdding(true);
        try {
            await addStudent(payload);
            // Ensure we navigate back to list to see the update
            navigate("/students");
            return { status: "success" };
        } catch (e) {
            const status = e?.response?.status;
            const msg = e?.response?.data?.message || "Failed to add student";

            if (status === 409) {
                if (msg.includes("email")) {
                    return { status: "error", code: "DUPLICATE", field: "email", message: msg };
                }
                if (msg.includes("phone")) {
                    return { status: "error", code: "DUPLICATE", field: "parentPhoneNum", message: msg };
                }
            }

            alert(msg);
            return { status: "error", code: "OTHER", message: msg };
        } finally {
            setAdding(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Register Student</h1>
                        <p className="text-slate-500 mt-1">Add a new student to the system</p>
                    </div>
                    <Link to="/students" className="btn-secondary self-start md:self-auto">
                        <i className="fa-solid fa-arrow-left mr-2"></i> Back to List
                    </Link>
                </div>

                <StudentForm onSubmit={handleAdd} submitting={adding} nextIndex={nextIndex} />
            </div>
        </Layout>
    );
};

export default AddStudent;
