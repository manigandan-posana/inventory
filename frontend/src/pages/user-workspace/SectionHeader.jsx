import React from "react";

export default function SectionHeader({ title, isOpen, onToggle, rightContent = null }) {
  return (
    <div className="flex w-full items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-800 shadow-inner">
      <button type="button" onClick={onToggle} className="flex flex-1 items-center gap-2 text-left">
        <span className="text-[10px] text-slate-500">{isOpen ? "▾" : "▸"}</span>
        <span className="font-semibold">{title}</span>
      </button>
      <div className="flex items-center gap-2 text-[10px] text-slate-500">{rightContent}</div>
    </div>
  );
}
