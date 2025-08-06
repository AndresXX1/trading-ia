import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import signalsReducer from '../features/signals/signalsSlice'
import chartReducer from '../features/chart/chartSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    signals: signalsReducer,
    chart: chartReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
})