import React, { useState } from "react";

const initial = {
  name: "",
  section: "",
  parentName: "",
  parentPhoneNum: "",
  email: "",
  isSibling: false,
  profilePic: null // File object
};

const initialErrors = {};

const StudentForm = ({ onSubmit, submitting, nextIndex }) => {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState(initialErrors);
  const [showSiblingOption, setShowSiblingOption] = useState(false);

  const validateField = (key, value) => {
    switch (key) {
      case "name":
        if (value.trim() === "") return "Student name cannot be empty.";
        if (!/^[A-Z]/.test(value)) return "Student name must start with a capital letter.";
        return null;

      case "section":
        return !/^\d+[A-Z]$/.test(value) ? "Section must be a number followed by an uppercase letter (e.g., 10A)." : null;
      case "parentName":
        if (value.trim() === "") return "Parent name cannot be empty.";
        if (!/^[A-Z]/.test(value)) return "Parent name must start with a capital letter.";
        return null;
      case "parentPhoneNum":
        return !/^\+94\s?\d{9}$/.test(value) ? "Phone number must be +94 followed by 9 digits (e.g., +94 712345678)." : null;
      case "email":
        return !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(value) ? "Please enter a valid Gmail address (@gmail.com)." : null;
      default:
        return null;
    }
  };

  const handleChange = (key) => (e) => {
    let value;
    if (e.target.type === "checkbox") {
      value = e.target.checked;
    } else if (e.target.type === "file") {
      value = e.target.files[0];
    } else {
      value = e.target.value;
    }

    // Skip validation for file for now, or validate size/type
    const error = key === "profilePic" ? null : validateField(key, value);

    setForm((f) => ({ ...f, [key]: value }));
    setForm((f) => ({ ...f, [key]: value }));

    // If checking "Same Parent", clear duplicate errors to enable submit button
    if (key === "isSibling") {
      if (value === true) {
        setErrors((e) => {
          const newErrors = { ...e };
          delete newErrors.email;
          delete newErrors.parentPhoneNum;
          return newErrors;
        });
      }
    } else {
      setErrors((e) => ({ ...e, [key]: error }));
    }
  };

  const submit = (e) => {
    e.preventDefault();
    // Validate all before submit
    const newErrors = {};
    let hasError = false;
    Object.keys(form).forEach(key => {
      const error = validateField(key, form[key]);
      if (error) {
        newErrors[key] = error;
        hasError = true;
      }
    });

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    // Construct payload
    // If we have a file, we MUST use FormData
    let payload = form;
    if (form.profilePic) {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (key === "profilePic" && !form[key]) return; // don't append null
        formData.append(key, form[key]);
      });
      payload = formData;
    }

    // Async submit handling
    const result = onSubmit(payload, () => {
      setForm(initial);
      setErrors({});
      setShowSiblingOption(false);
    });

    // Handle promise if returned
    if (result && typeof result.then === 'function') {
      result.then((res) => {
        if (res && res.status === 'error' && res.code === 'DUPLICATE') {
          setErrors(prev => ({ ...prev, [res.field]: res.message }));
          setShowSiblingOption(true);
        }
      });
    }
  };

  const getFieldStatus = (name) => {
    const value = form[name];
    const error = errors[name];
    if (!value) return "neutral"; // Empty input is neutral
    if (error) return "invalid";
    return "valid";
  };

  const getInputClasses = (status) => {
    const baseClasses = "input-field w-full pl-10";

    if (status === "valid") {
      return `${baseClasses} border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/10 bg-emerald-50/30 text-emerald-900`;
    }
    if (status === "invalid") {
      return `${baseClasses} border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 bg-rose-50/30 text-rose-900`;
    }
    return baseClasses;
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="card p-0 overflow-hidden border-0 shadow-xl">
        {/* Header Section */}
        <div className="bg-gradient-brand p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10 flex justify-between items-center">
            <h2 className="text-4xl font-extrabold mb-3 tracking-tight">Add New Student</h2>

          </div>
        </div>

        <form onSubmit={submit} className="p-8 bg-white">

          {/* Profile Photo Upload */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-50 flex items-center justify-center mb-3">
              {form.profilePic ? (
                <img src={URL.createObjectURL(form.profilePic)} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <i className="fa-solid fa-camera text-slate-300 text-3xl"></i>
              )}
              <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <i className="fa-solid fa-pen text-sm"></i>
                <input type="file" className="hidden" accept="image/*" onChange={handleChange("profilePic")} />
              </label>
            </div>
            <span className="text-xs text-slate-500 font-medium">Upload Photo (Optional)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

            {/* Student Name */}
            <div className="group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Student Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  className={getInputClasses(getFieldStatus("name"))}
                  value={form.name}
                  onChange={handleChange("name")}
                  required
                  placeholder="e.g. John Doe"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <i className="fa-solid fa-user"></i>
                </div>
                {getFieldStatus("name") === "valid" && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none animate-fade-in">
                    <i className="fa-solid fa-check-circle"></i>
                  </div>
                )}
              </div>
              {getFieldStatus("name") === "invalid" && (
                <p className="flex items-center mt-2 text-xs font-medium text-rose-500 animate-pulse">
                  <i className="fa-solid fa-circle-exclamation mr-1.5"></i> {errors.name}
                </p>
              )}
            </div>



            {/* Index Number (Auto-Generated) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Index Number <span className="text-emerald-500 text-[10px] ml-1">(Auto-Generated)</span>
              </label>
              <div className="relative">
                <input
                  className="input-field w-full pl-10 bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
                  value={nextIndex || "Loading..."}
                  readOnly
                  disabled
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <i className="fa-solid fa-id-card"></i>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400 ml-1">System automatically assigns the next available index.</p>
            </div>
            {/* Section */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Class / Section <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  className={getInputClasses(getFieldStatus("section"))}
                  value={form.section}
                  onChange={handleChange("section")}
                  required
                  placeholder="10A"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <i className="fa-solid fa-chalkboard-user"></i>
                </div>
              </div>
              {getFieldStatus("section") === "invalid" && <p className="mt-2 text-xs font-medium text-rose-500"><i className="fa-solid fa-circle-exclamation mr-1"></i> {errors.section}</p>}
              {getFieldStatus("section") === "neutral" && <p className="mt-2 text-xs text-slate-400 ml-1">Format: Number + Uppercase Letter</p>}
            </div>



            <div className="col-span-1 md:col-span-2 my-2 border-t border-slate-100"></div>

            {/* Parent Name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Parent Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  className={getInputClasses(getFieldStatus("parentName"))}
                  value={form.parentName}
                  onChange={handleChange("parentName")}
                  required
                  placeholder="Jane Doe"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <i className="fa-solid fa-user-group"></i>
                </div>
              </div>
              {getFieldStatus("parentName") === "invalid" && <p className="mt-2 text-xs font-medium text-rose-500"><i className="fa-solid fa-circle-exclamation mr-1"></i> {errors.parentName}</p>}
            </div>

            {/* Parent Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Parent Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  className={getInputClasses(getFieldStatus("parentPhoneNum"))}
                  value={form.parentPhoneNum}
                  onChange={handleChange("parentPhoneNum")}
                  required
                  placeholder="+94 7XX XXX XXX"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <i className="fa-solid fa-phone"></i>
                </div>
              </div>
              {getFieldStatus("parentPhoneNum") === "invalid" && <p className="mt-2 text-xs font-medium text-rose-500"><i className="fa-solid fa-circle-exclamation mr-1"></i> {errors.parentPhoneNum}</p>}
              {getFieldStatus("parentPhoneNum") === "neutral" && <p className="mt-2 text-xs text-slate-400 ml-1">Format: +94 followed by 9 digits</p>}
            </div>

            {/* Parent Email */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Parent Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  className={getInputClasses(getFieldStatus("email"))}
                  value={form.email}
                  onChange={handleChange("email")}
                  required
                  placeholder="parent@gmail.com"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <i className="fa-solid fa-envelope"></i>
                </div>
              </div>
              {getFieldStatus("email") === "invalid" && <p className="mt-2 text-xs font-medium text-rose-500"><i className="fa-solid fa-circle-exclamation mr-1"></i> {errors.email}</p>}
            </div>

            {/* Same Parent (Sibling) Checkbox */}
            {showSiblingOption && (
              <div className="col-span-1 md:col-span-2 flex items-center mt-2 animate-fade-in">
                <label className="flex items-center cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={form.isSibling}
                      onChange={handleChange("isSibling")}
                    />
                    <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-primary-500 peer-checked:border-primary-500 transition-all flex items-center justify-center">
                      <i className="fa-solid fa-check text-white text-[10px] transform scale-0 peer-checked:scale-100 transition-transform"></i>
                    </div>
                  </div>
                  <span className="ml-2 text-sm text-slate-600 font-medium group-hover:text-primary-600 transition-colors">
                    Same Parent (Sibling) - Allow duplicate email
                  </span>
                </label>
              </div>
            )}

          </div>

          {/* Submit Action */}
          <div className="mt-10 flex justify-end">
            <button
              type="submit"
              disabled={submitting || Object.values(errors).some(Boolean)}
              className={`
                px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all duration-300 flex items-center gap-2
                ${(submitting || Object.values(errors).some(Boolean))
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "btn-primary shadow-primary-500/30 hover:-translate-y-0.5"
                }
              `}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Adding Student...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-user-plus"></i>
                  Add Student
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentForm;
