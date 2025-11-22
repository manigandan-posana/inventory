import { useState } from "react";

export default function UserLogin({ onSubmit, error, loading }) {
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(form);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow">
      <div className="mb-2 text-center text-base font-semibold text-slate-800">User Workspace</div>
      <p className="mb-3 text-center text-[11px] text-slate-500">
        Procurement Managers and Project Heads get all projects, others see assigned projects.
      </p>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Email
        <input
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          required
        />
      </label>
      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Password
        <input
          type="password"
          value={form.password}
          onChange={(e) => handleChange("password", e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          required
        />
      </label>
      {error && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className={`w-full rounded px-3 py-2 text-sm font-semibold text-white ${
          loading ? "bg-slate-400" : "bg-sky-600 hover:bg-sky-700"
        }`}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
