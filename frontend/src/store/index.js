import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import materialReducer from "./materialSlice";
import adminProjectsReducer from "./adminProjectsSlice";
import adminUsersReducer from "./adminUsersSlice";
import adminAllocationsReducer from "./adminAllocationsSlice";
import workspaceReducer from "./workspaceSlice";
import workspaceUiReducer from "./workspaceUiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    materials: materialReducer,
    adminProjects: adminProjectsReducer,
    adminUsers: adminUsersReducer,
    adminAllocations: adminAllocationsReducer,
    workspace: workspaceReducer,
    workspaceUi: workspaceUiReducer,
  },
});
