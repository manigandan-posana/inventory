import { combineReducers } from "@reduxjs/toolkit";

// adjust import paths if your slices are in a different folder
import auth from "../store/slices/authSlice";
import materials from "../store/slices/materialSlice";
import adminProjects from "../store/slices/adminProjectsSlice";
import adminUsers from "../store/slices/adminUsersSlice";
import adminAllocations from "../store/slices/adminAllocationsSlice";
import workspace from "../store/slices/workspaceSlice";
import workspaceUi from "../store/slices/workspaceUiSlice";

const rootReducer = combineReducers({
  auth,
  materials,
  adminProjects,
  adminUsers,
  adminAllocations,
  workspace,
  workspaceUi,
});

export default rootReducer;
