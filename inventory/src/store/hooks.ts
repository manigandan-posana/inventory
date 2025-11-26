import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";
import type { RootState, AppDispatch } from "./store";

// Use this instead of useDispatch() directly
export const useAppDispatch: () => AppDispatch = useDispatch;

// Use this instead of useSelector() directly
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
    