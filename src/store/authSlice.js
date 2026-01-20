import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest } from '../lib/apiClient.js';
import { decodeJwt } from '../lib/jwt.js';

const LS_KEY = 'forum_token';

function loadToken() {
  return localStorage.getItem(LS_KEY);
}

function saveToken(token) {
  localStorage.setItem(LS_KEY, token);
}

function clearToken() {
  localStorage.removeItem(LS_KEY);
}

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      // POST /users/register
      const data = await apiRequest('/users/register', {
        method: 'POST',
        body: payload,
      });
      return data;
    } catch (e) {
      return rejectWithValue({
        message: e.message,
        status: e.status,
        data: e.data,
      });
    }
  }
);

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    try {
      // POST /users/login -> { token: "..." }
      const data = await apiRequest('/users/login', {
        method: 'POST',
        body: payload,
      });
      const token = data?.token;
      if (!token) throw new Error('Login response missing token');
      return { token };
    } catch (e) {
      return rejectWithValue({
        message: e.message,
        status: e.status,
        data: e.data,
      });
    }
  }
);

const initialToken = loadToken();
const initialUser = initialToken ? decodeJwt(initialToken) : null;

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: initialToken,
    user: initialUser, // claims: userId/type/active/verified ...
    status: 'idle',
    error: null,
    registerStatus: 'idle',
    registerError: null,
  },
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      state.status = 'idle';
      state.error = null;
      clearToken();
    },
  },
  extraReducers: (builder) => {
    builder
      // register
      .addCase(registerThunk.pending, (state) => {
        state.registerStatus = 'loading';
        state.registerError = null;
      })
      .addCase(registerThunk.fulfilled, (state) => {
        state.registerStatus = 'succeeded';
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.registerStatus = 'failed';
        state.registerError = action.payload?.message || 'Register failed';
      })
      // login
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        const token = action.payload.token;
        state.token = token;
        state.user = decodeJwt(token);
        state.status = 'succeeded';
        saveToken(token);
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || 'Login failed';
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
