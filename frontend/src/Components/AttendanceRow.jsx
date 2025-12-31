import React from "react";
import { STATUS_OPTIONS } from "../utils/statusOptions";

const AttendanceRow = ({ student, row, onChange, disabled, acceptedLeave, alreadyMarked }) => {
  const handleStatusChange = (newStatus) => {
    if (disabled || alreadyMarked) return;
    onChange({ ...row, status: newStatus });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Present": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Absent": return "bg-rose-100 text-rose-700 border-rose-200";
      case "Late": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Excused": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <tr className={`
      group transition-colors duration-200
      ${acceptedLeave ? "bg-amber-50/50 hover:bg-amber-50" : "hover:bg-slate-50"}
      ${alreadyMarked ? "opacity-75 grayscale-[0.5]" : ""}
    `}>
      <td className="px-6 py-4">
        <div>
          <div className="font-semibold text-slate-900">{student.name}</div>
          {acceptedLeave && (
            <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-amber-600">
              <i className="fas fa-info-circle"></i>
              Accepted Leave
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="font-mono text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
          {student.std_index}
        </span>
      </td>
      <td className="px-6 py-4">
        {row.status === "Present" && <span className="inline-flex w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>}
        {row.status === "Absent" && <span className="inline-flex w-2 h-2 rounded-full bg-rose-500 mr-2"></span>}
        {row.status === "Late" && <span className="inline-flex w-2 h-2 rounded-full bg-amber-500 mr-2"></span>}
        {row.status === "Excused" && <span className="inline-flex w-2 h-2 rounded-full bg-blue-500 mr-2"></span>}
        <span className="text-sm text-slate-600">{student.section}</span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {/* Segmented Control */}
          <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
            {STATUS_OPTIONS.map((opt) => {
              const isActive = row.status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled || alreadyMarked}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`
                    relative px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200
                    ${isActive
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }
                    ${(disabled || alreadyMarked) ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                  `}
                  title={opt.label}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {alreadyMarked && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 ml-2">
              <i className="fa-solid fa-check mr-1"></i> Done
            </span>
          )}
        </div>
      </td>
    </tr>
  );
};

export default AttendanceRow;
