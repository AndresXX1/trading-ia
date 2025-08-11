import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import signalsReducer from '../features/signals/signalsSlice'
import chartReducer from '../features/chart/chartSlice'
import mt5Reducer from "../features/auth/mt5-slice"
export const store = configureStore({
  reducer: {
    auth: authReducer,
    signals: signalsReducer,
    chart: chartReducer,
    mt5: mt5Reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
})