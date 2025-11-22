import React from "react";

const tabs = [
  { id: "bom", label: "BOM" },
  { id: "inward", label: "Inwards" },
  { id: "outward", label: "Outwards" },
  { id: "transfer", label: "Site Transfer" },
];

export default function WorkspaceTabs({ activeTab, onTabChange, onOpenMaster }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200">
      <div className="flex text-[11px] font-medium">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            className={
              "px-3 py-1 -mb-px border-b-[2px]" +
              (activeTab === tab.id
                ? " border-sky-400 bg-sky-50 text-sky-700"
                : " border-transparent text-slate-500 hover:text-slate-600")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenMaster}
        className="ml-2 flex items-center justify-center rounded border border-slate-200 px-2 py-[3px] text-[12px] text-slate-600 hover:bg-slate-100"
        title="Add / Manage materials (Master)"
      >
        ＋
      </button>
    </div>
  );
}
