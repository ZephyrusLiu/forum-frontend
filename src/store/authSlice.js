import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest } from '../lib/apiClient.js';
import { decodeJwt } from '../lib/jwt.js';

function normalizeUserFromJwtPayload(payload) {
  if (!payload) return null;

  const userId = payload.sub ?? payload.id;
  const type = payload.type; // 'user' | 'admin' | 'super'
  const status = payload.status; // 'unverified' | 'active' | 'banned'

  if (!userId || !type || !status) return null;

  return {
    userId: String(userId),
    type: String(type),
    status: String(status),
    verified: String(status) === 'active',
  };
}

function extractToken(resp) {
  // support {token} OR {result:{token}}
  return resp?.token ?? resp?.result?.token ?? null;
}

function initFromStorage() {
  const token = localStorage.getItem('token');
  if (!token) return { token: null, user: null };

  const payload = decodeJwt(token);
  const user = normalizeUserFromJwtPayload(payload);

  // Safety: treat banned as visitor in FE
  if (!user || user.status === 'banned') {
    localStorage.removeItem('token');
    return { token: null, user: null };
  }

  return { token, user };
}

export const loginThunk = createAsyncThunk('auth/login', async (payload, thunkApi) => {
  try {
    const response = await apiRequest('POST', '/users/login', null, payload);
    const token = extractToken(response);
    if (!token) throw new Error('Login succeeded but token is missing');
    return { token };
  } catch (err) {
    return thunkApi.rejectWithValue(err.message);
  }
});

export const registerThunk = createAsyncThunk('auth/register', async (payload, thunkApi) => {
  try {
    const response = await apiRequest('POST', '/users/register', null, payload);
    const token = extractToken(response);
    return { token, response };
  } catch (err) {
    return thunkApi.rejectWithValue(err.message);
  }
});

export const verifyTokenThunk = createAsyncThunk('auth/verifyToken', async (_, thunkApi) => {
  try {
    const token = thunkApi.getState().auth.token;
    if (!token) throw new Error('No token');
    const response = await apiRequest('GET', '/users/verify-token', token);
    const newToken = extractToken(response) || token;
    return { token: newToken };
  } catch (err) {
    return thunkApi.rejectWithValue(err.message);
  }
});

export const verifyEmailThunk = createAsyncThunk('auth/verifyEmail', async (payload, thunkApi) => {
  try {
    const token = thunkApi.getState().auth.token;
    const response = await apiRequest('POST', '/users/verify', token, payload);
    return response;
  } catch (err) {
    return thunkApi.rejectWithValue(err.message);
  }
});

const initial = initFromStorage();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: initial.token,
    user: initial.user,
    loading: false,
    error: null,
    registerStatus: 'idle',
    registerError: null,
    verifyEmailStatus: 'idle',
    verifyEmailError: null,
  },
  reducers: {
    logout: (state) => {
      state.token = null;
      state.user = null;
      localStorage.removeItem('token');
    },
    setTokenAndUser: (state, action) => {
      const token = action.payload;

      const payload = decodeJwt(token);
      const user = normalizeUserFromJwtPayload(payload);

      if (!user) {
        state.error = 'Invalid token';
        state.token = null;
        state.user = null;
        localStorage.removeItem('token');
        return;
      }

      if (user.status === 'banned') {
        state.error = 'This account is banned.';
        state.token = null;
        state.user = null;
        localStorage.removeItem('token');
        return;
      }

      state.token = token;
      state.user = user;
      state.error = null;
      localStorage.setItem('token', token);
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        authSlice.caseReducers.setTokenAndUser(state, { payload: action.payload.token });
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // register
      .addCase(registerThunk.pending, (state) => {
        state.registerStatus = 'loading';
        state.registerError = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.registerStatus = 'succeeded';
        state.registerError = null;
        if (action.payload?.token) {
          authSlice.caseReducers.setTokenAndUser(state, { payload: action.payload.token });
        }
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.registerStatus = 'failed';
        state.registerError = action.payload;
      })

      // verify token
      .addCase(verifyTokenThunk.fulfilled, (state, action) => {
        authSlice.caseReducers.setTokenAndUser(state, { payload: action.payload.token });
      })

      // verify email
      .addCase(verifyEmailThunk.pending, (state) => {
        state.verifyEmailStatus = 'loading';
        state.verifyEmailError = null;
      })
      .addCase(verifyEmailThunk.fulfilled, (state) => {
        state.verifyEmailStatus = 'succeeded';
        state.verifyEmailError = null;
      })
      .addCase(verifyEmailThunk.rejected, (state, action) => {
        state.verifyEmailStatus = 'failed';
        state.verifyEmailError = action.payload;
      });
  },
});

export const { logout, setTokenAndUser } = authSlice.actions;
export default authSlice.reducer;
