import React, { FC, ReactNode } from "react";

export interface ModalShellProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode | null;
}

const ModalShell: FC<ModalShellProps> = ({
  open,
  title,
  onClose,
  children,
  footer = null,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 text-[11px] text-slate-800">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-semibold">
          <span>{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto py-3 text-slate-600">
          {children}
        </div>
        {footer && <div className="border-t border-slate-200 pt-2">{footer}</div>}
      </div>
    </div>
  );
};

export default ModalShell;
