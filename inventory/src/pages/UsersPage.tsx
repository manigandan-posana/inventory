import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store"; // ⬅️ adjust path if needed

const ADMIN_ROLES = ["ADMIN", "CEO", "COO"] as const;

type AdminRole = (typeof ADMIN_ROLES)[number];

interface CurrentUser {
  id?: string | number;
  name?: string;
  email?: string;
  role?: AdminRole | string; // keep `string` to stay compatible with your backend
}

interface AuthState {
  token: string | null;
  currentUser: CurrentUser | null;
}

const UsersPage: React.FC = () => {
  const { token, currentUser } = useSelector<RootState, AuthState>(
    (state) => state.auth as AuthState
  );

  const canUseAdmin = currentUser?.role
    ? ADMIN_ROLES.includes(currentUser.role as AdminRole)
    : false;

  const target = token
    ? canUseAdmin
      ? "/admin/materials"
      : "/workspace"
    : "/";

  return <Navigate to={target} replace />;
};

export default UsersPage;
