import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/index';

export const fetchSignals = createAsyncThunk(
  'signals/fetchSignals',
  async ({ pair, timeframe }, { rejectWithValue }) => {
    try {
      const response = await api.getSignals(pair, timeframe);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const subscribeToSignals = createAsyncThunk(
  'signals/subscribe',
  async ({ pair, timeframe }, { rejectWithValue }) => {
    try {
      // Esto sería para WebSocket o conexión en tiempo real
      const response = await api.subscribeToSignals(pair, timeframe);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const signalsSlice = createSlice({
  name: 'signals',
  initialState: {
    currentPair: 'EURUSD',
    currentTimeframe: 'H1',
    signals: [],
    loading: false,
    error: null,
    subscription: null
  },
  reducers: {
    setPair: (state, action) => {
      state.currentPair = action.payload;
    },
    setTimeframe: (state, action) => {
      state.currentTimeframe = action.payload;
    },
    clearSignals: (state) => {
      state.signals = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSignals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSignals.fulfilled, (state, action) => {
        state.loading = false;
        state.signals = action.payload.signals;
      })
      .addCase(fetchSignals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Error fetching signals';
      })
      .addCase(subscribeToSignals.fulfilled, (state, action) => {
        state.subscription = action.payload.subscriptionId;
      });
  }
});

export const { setPair, setTimeframe, clearSignals } = signalsSlice.actions;

export const selectCurrentSignals = (state) => state.signals.signals;
export const selectLoading = (state) => state.signals.loading;
export const selectError = (state) => state.signals.error;
export const selectCurrentPair = (state) => state.signals.currentPair;
export const selectCurrentTimeframe = (state) => state.signals.currentTimeframe;

export default signalsSlice.reducer;