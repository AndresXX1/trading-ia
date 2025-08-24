import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import api from "../../api/index"

// ========================================
// 🔄 ASYNC THUNKS - REORGANIZADOS Y LIMPIOS
// ========================================

// Conectar a MT5 (POST /api/mt5/connect)
export const connectMT5 = createAsyncThunk(
  "mt5/connect",
  async ({ login, password, server, account_type, remember = false }, { rejectWithValue }) => {
    try {
      const res = await api.connectMT5Account({ login, password, server, account_type, remember })

      if (remember) {
        localStorage.setItem("mt5Remember", "1")
        if (login) localStorage.setItem("mt5LastLogin", String(login))
        if (server) localStorage.setItem("mt5LastServer", String(server))
      }

      return res
    } catch (err) {
      return rejectWithValue(err?.response?.data?.detail || err?.message || "Error conectando MT5")
    }
  },
)

// Obtener info de cuenta (GET /api/mt5/account)
export const fetchMT5Account = createAsyncThunk("mt5/account", async (_, { rejectWithValue }) => {
  try {
    const res = await api.getMT5AccountInfo()
    return res
  } catch (err) {
    return rejectWithValue(err?.response?.data?.detail || err?.message || "Error obteniendo cuenta MT5")
  }
})

// Autoconectar (POST /api/mt5/autoconnect)
export const autoConnectMT5 = createAsyncThunk("mt5/autoconnect", async (_, { rejectWithValue }) => {
  try {
    const res = await api.autoConnectMT5()
    return res
  } catch (err) {
    return rejectWithValue(err?.response?.data?.detail || err?.message || "Error autoconectando MT5")
  }
})

export const loadMT5Profile = createAsyncThunk("mt5/profile/load", async (_, { rejectWithValue }) => {
  try {
    const res = await api.getMT5Profile()
    return res
  } catch (err) {
    return rejectWithValue(err?.response?.data?.detail || err?.message || "Error cargando perfil MT5")
  }
})

export const saveMT5Profile = createAsyncThunk(
  "mt5/profile/save",
  async ({ login, server, account_type }, { rejectWithValue }) => {
    try {
      const res = await api.saveMT5Profile({ login, server, account_type })
      return res
    } catch (err) {
      return rejectWithValue(err?.response?.data?.detail || err?.message || "Error guardando perfil MT5")
    }
  },
)

export const deleteMT5Profile = createAsyncThunk("mt5/profile/delete", async (_, { rejectWithValue }) => {
  try {
    const res = await api.deleteMT5Profile()

    localStorage.removeItem("mt5Remember")
    localStorage.removeItem("mt5LastLogin")
    localStorage.removeItem("mt5LastServer")

    return res
  } catch (err) {
    return rejectWithValue(err?.response?.data?.detail || err?.message || "Error eliminando perfil MT5")
  }
})

// Desconectar (POST /api/mt5/disconnect)
export const disconnectMT5 = createAsyncThunk("mt5/disconnect", async (_, { rejectWithValue }) => {
  try {
    const res = await api.disconnectMT5Account()
    return res
  } catch (err) {
    return rejectWithValue(err?.response?.data?.detail || err?.message || "Error desconectando MT5")
  }
})

// ========================================
// 🏪 INITIAL STATE - MEJORADO
// ========================================
const initialState = {
  connected: false,
  account: null,
  lastLogin: typeof window !== "undefined" ? localStorage.getItem("mt5LastLogin") : null,
  lastServer: typeof window !== "undefined" ? localStorage.getItem("mt5LastServer") : null,
  account_type: null, // 'demo' | 'real'
  profile: null,
  remember: typeof window !== "undefined" ? localStorage.getItem("mt5Remember") === "1" : false,
  autoReconnect: typeof window !== "undefined" ? localStorage.getItem("mt5AutoReconnect") === "1" : false,
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
}

// ========================================
// 🍰 SLICE DEFINITION - REORGANIZADO
// ========================================
const mt5Slice = createSlice({
  name: "mt5",
  initialState,
  reducers: {
    setAutoReconnect(state, action) {
      state.autoReconnect = !!action.payload
      if (typeof window !== "undefined") {
        if (state.autoReconnect) {
          localStorage.setItem("mt5AutoReconnect", "1")
        } else {
          localStorage.removeItem("mt5AutoReconnect")
        }
      }
    },

    setRemember(state, action) {
      state.remember = !!action.payload
      if (typeof window !== "undefined") {
        if (state.remember) {
          localStorage.setItem("mt5Remember", "1")
        } else {
          localStorage.removeItem("mt5Remember")
        }
      }
    },

    clearError(state) {
      state.error = null
    },

    resetMT5State(state) {
      return {
        ...initialState,
        lastLogin: state.lastLogin,
        lastServer: state.lastServer,
        remember: state.remember,
        autoReconnect: state.autoReconnect,
      }
    },
  },

  extraReducers: (builder) => {
    builder
      // ========================================
      // 🔌 CONNECTION HANDLERS
      // ========================================
      .addCase(connectMT5.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(connectMT5.fulfilled, (state, action) => {
        state.status = "succeeded"
        state.connected = !!(action.payload?.connected ?? true)
        state.lastLogin = action.payload?.login || state.lastLogin
        state.lastServer = action.payload?.server || state.lastServer
        state.account_type = action.payload?.account_type || state.account_type

        state.account = {
          login: action.payload?.login,
          server: action.payload?.server,
          balance: action.payload?.balance,
          equity: action.payload?.equity,
          margin_free: action.payload?.margin_free,
          currency: action.payload?.currency,
          account_type: action.payload?.account_type,
        }
      })
      .addCase(connectMT5.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload || "No se pudo conectar"
        state.connected = false
      })

      // ========================================
      // 🔄 AUTOCONNECT HANDLERS
      // ========================================
      .addCase(autoConnectMT5.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(autoConnectMT5.fulfilled, (state, action) => {
        state.status = "succeeded"
        state.connected = !!action.payload?.connected

        if (action.payload?.login) state.lastLogin = action.payload.login
        if (action.payload?.server) state.lastServer = action.payload.server
        if (action.payload?.account_type) state.account_type = action.payload.account_type
      })
      .addCase(autoConnectMT5.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload || "No se pudo autoconectar"
      })

      // ========================================
      // 📊 ACCOUNT HANDLERS
      // ========================================
      .addCase(fetchMT5Account.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(fetchMT5Account.fulfilled, (state, action) => {
        state.status = "succeeded"
        state.account = action.payload || null

        if (action.payload) {
          state.connected = true
          state.lastLogin = action.payload.login || state.lastLogin
          state.lastServer = action.payload.server || state.lastServer
          state.account_type = action.payload.account_type || state.account_type
        }
      })
      .addCase(fetchMT5Account.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload || "No se pudo obtener la cuenta"
      })

      // ========================================
      // 👤 PROFILE HANDLERS
      // ========================================
      .addCase(loadMT5Profile.fulfilled, (state, action) => {
        state.profile = action.payload?.profile || null

        if (state.profile) {
          state.lastLogin = state.profile.login || state.lastLogin
          state.lastServer = state.profile.server || state.lastServer
          state.account_type = state.profile.account_type || state.account_type
        }
      })
      .addCase(saveMT5Profile.fulfilled, (state, action) => {
        state.profile = action.payload?.profile || null
        state.remember = true
      })
      .addCase(deleteMT5Profile.fulfilled, (state) => {
        state.profile = null
        state.remember = false
      })

      // ========================================
      // 🔌 DISCONNECT HANDLERS
      // ========================================
      .addCase(disconnectMT5.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(disconnectMT5.fulfilled, (state) => {
        state.status = "succeeded"
        state.connected = false
        state.account = null
      })
      .addCase(disconnectMT5.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload || "No se pudo desconectar"
      })
  },
})

// ========================================
// 🎯 EXPORTS
// ========================================
export const { setAutoReconnect, setRemember, clearError, resetMT5State } = mt5Slice.actions
export default mt5Slice.reducer
