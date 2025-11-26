import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store"; // 🔁 adjust path if needed

const UserWorkspace: React.FC = () => {
  // We tell TypeScript our state shape using RootState
  const token = useSelector((state: RootState) => state.auth.token);

  const preferredRoute = token ? "/workspace" : "/";

  return <Navigate to={preferredRoute} replace />;
};

export default UserWorkspace;
