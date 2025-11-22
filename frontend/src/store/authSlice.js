import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  token: null,
  currentUser: null,
  adminLoginError: "",
  userLoginError: "",
  adminLoginLoading: false,
  userLoginLoading: false,
  dataVersion: 0,
  checkingSession: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken(state, action) {
      state.token = action.payload;
    },
    setCurrentUser(state, action) {
      state.currentUser = action.payload;
    },
    setAdminLoginError(state, action) {
      state.adminLoginError = action.payload || "";
    },
    setUserLoginError(state, action) {
      state.userLoginError = action.payload || "";
    },
    setAdminLoginLoading(state, action) {
      state.adminLoginLoading = Boolean(action.payload);
    },
    setUserLoginLoading(state, action) {
      state.userLoginLoading = Boolean(action.payload);
    },
    incrementDataVersion(state) {
      state.dataVersion += 1;
    },
    setCheckingSession(state, action) {
      state.checkingSession = Boolean(action.payload);
    },
    resetAuthState() {
      return { ...initialState, checkingSession: false };
    },
  },
});

export const {
  setToken,
  setCurrentUser,
  setAdminLoginError,
  setUserLoginError,
  setAdminLoginLoading,
  setUserLoginLoading,
  incrementDataVersion,
  setCheckingSession,
  resetAuthState,
} = authSlice.actions;

export default authSlice.reducer;
