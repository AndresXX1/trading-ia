import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/index'

export const fetchSignals = createAsyncThunk(
  'chart/fetchSignals',
  async ({ pair, timeframe }, { rejectWithValue }) => {
    try {
      const [signalsResponse, realtimeResponse] = await Promise.all([
        api.getSignals(pair, timeframe),
        api.getRealTimeData(pair, timeframe)
      ])
      
      return {
        signals: signalsResponse.signals[0],
        data: realtimeResponse.data
      }
    } catch (error) {
      return rejectWithValue(error.response.data)
    }
  }
)

const chartSlice = createSlice({
  name: 'chart',
  initialState: {
    data: null,
    signals: null,
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSignals.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchSignals.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.data = action.payload.data
        state.signals = action.payload.signals
      })
      .addCase(fetchSignals.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload.message
      })
  }
})

export default chartSlice.reducer