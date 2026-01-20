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
      const data = await apiRequest('/users/register', { method: 'POST', body: payload });
      return data;
    } catch (e) {
      return rejectWithValue({ message: e.message, status: e.status, data: e.data });
    }
  }
);

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await apiRequest('/users/login', { method: 'POST', body: payload });
      const token = data?.token;
      if (!token) throw new Error('Login response missing token');
      return { token };
    } catch (e) {
      return rejectWithValue({ message: e.message, status: e.status, data: e.data });
    }
  }
);

// Option A: code entry
export const verifyEmailThunk = createAsyncThunk(
  'auth/verifyEmail',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      // POST /users/verify  body: { email, code }
      const data = await apiRequest('/users/verify', {
        method: 'POST',
        token,
        body: payload,
      });

      // If return new token, update
      if (data?.token) return { token: data.token, verified: true };
      return { verified: true };
    } catch (e) {
      return rejectWithValue({ message: e.message, status: e.status, data: e.data });
    }
  }
);

// Option B: token URL landing
export const verifyTokenThunk = createAsyncThunk(
  'auth/verifyToken',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const { token: authToken } = getState().auth;
      // POST /users/verify body: { token } or backend query param
      const data = await apiRequest('/users/verify', {
        method: 'POST',
        token: authToken,
        body: payload,
      });

      if (data?.token) return { token: data.token, verified: true };
      return { verified: true };
    } catch (e) {
      return rejectWithValue({ message: e.message, status: e.status, data: e.data });
    }
  }
);

const initialToken = loadToken();
const initialUser = initialToken ? decodeJwt(initialToken) : null;

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: initialToken,
    user: initialUser,
    status: 'idle',
    error: null,

    registerStatus: 'idle',
    registerError: null,

    verifyStatus: 'idle',
    verifyError: null,
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
      })

      // verify (code)
      .addCase(verifyEmailThunk.pending, (state) => {
        state.verifyStatus = 'loading';
        state.verifyError = null;
      })
      .addCase(verifyEmailThunk.fulfilled, (state, action) => {
        state.verifyStatus = 'succeeded';
        if (action.payload?.token) {
          state.token = action.payload.token;
          state.user = decodeJwt(action.payload.token);
          saveToken(action.payload.token);
        } else if (state.user) {
          state.user = { ...state.user, verified: true };
        }
      })
      .addCase(verifyEmailThunk.rejected, (state, action) => {
        state.verifyStatus = 'failed';
        state.verifyError = action.payload?.message || 'Verify failed';
      })

      // verify (token URL)
      .addCase(verifyTokenThunk.pending, (state) => {
        state.verifyStatus = 'loading';
        state.verifyError = null;
      })
      .addCase(verifyTokenThunk.fulfilled, (state, action) => {
        state.verifyStatus = 'succeeded';
        if (action.payload?.token) {
          state.token = action.payload.token;
          state.user = decodeJwt(action.payload.token);
          saveToken(action.payload.token);
        } else if (state.user) {
          state.user = { ...state.user, verified: true };
        }
      })
      .addCase(verifyTokenThunk.rejected, (state, action) => {
        state.verifyStatus = 'failed';
        state.verifyError = action.payload?.message || 'Verify failed';
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
