import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./rootReducer";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

// Inject the Redux store and logout action into the API service once the
// store has been created. These imports must be after rootReducer is
// imported to avoid circular dependency issues.
import { setApiStore, setLogoutAction } from "../utils/apiService";
import { logout } from "./slices/authSlice";

// redux-persist config: where & how to save Redux state
const persistConfig = {
  key: "root",   // key in localStorage
  storage,       // use browser localStorage
};

// Wrap your root reducer so the whole state is persisted
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // these actions are from redux-persist and can contain non-serializable data
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Persistor (used by <PersistGate> in your App)
export const persistor = persistStore(store);

// ---- API service setup ----
// Provide the configured store and logout thunk to the API service. This
// enables Axios interceptors to retrieve the auth token and dispatch
// logout actions without importing the store or auth slice directly. See
// src/utils/apiService.ts for details.
setApiStore(store);
// Pass a function that returns the logout thunk with a null token. This
// avoids type errors when Axios interceptors invoke logoutAction() with
// no parameters. The thunk will handle the null token internally.
setLogoutAction(() => logout(null));

// Types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
