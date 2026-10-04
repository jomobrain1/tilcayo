import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthState, AuthUser } from "./types.js";

const initialState: AuthState = { user: null, isAuthenticated: false, initialized: false };
export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    ready(state) { state.initialized = true; },
    session(_state, action: PayloadAction<AuthUser | null>): AuthState {
      return { user: action.payload, isAuthenticated: action.payload !== null, initialized: true };
    },
  },
});
