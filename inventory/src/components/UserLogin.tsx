import React, { useState } from "react";

interface UserLoginForm {
  email: string;
  password: string;
}

interface UserLoginProps {
  onSubmit?: (form: UserLoginForm) => void;
  error?: string | null;
  loading?: boolean;
}

const UserLogin: React.FC<UserLoginProps> = ({
  onSubmit,
  error,
  loading = false,
}) => {
  const [form, setForm] = useState<UserLoginForm>({
    email: "",
    password: "",
  });

  const handleChange = (field: keyof UserLoginForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--border)] bg-white px-4 py-5 text-[12px] shadow-sm"
    >
      <div className="mb-1 text-center text-sm font-semibold text-black">
        Workspace access
      </div>
      <p className="mb-4 text-center text-[11px] text-slate-600">
        Sign in here if you are a CEO, COO, procurement manager, project
        manager, project head or a regular user.  Only the Admin role
        should use the admin login.
      </p>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        Email
        <input
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-[9px] text-[12px] focus:border-[var(--primary)] focus:outline-none focus:ring-0"
          required
        />
      </label>
      <label className="mb-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        Password
        <input
          type="password"
          value={form.password}
          onChange={(e) => handleChange("password", e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-[9px] text-[12px] focus:border-[var(--primary)] focus:outline-none focus:ring-0"
          required
        />
      </label>
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-rose-600">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className={`w-full rounded-lg px-3 py-[10px] text-[12px] font-semibold text-white transition ${
          loading ? "bg-slate-400" : "bg-[var(--primary)] hover:bg-[#0f65d7]"
        }`}
      >
        {loading ? "Signing in…" : "Enter workspace"}
      </button>
    </form>
  );
};

export default UserLogin;
