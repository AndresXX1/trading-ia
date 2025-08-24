 
"use client"
import {
  Typography,
  Box,
  Grid,
  Card,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Divider,
  LinearProgress,
  Button,
} from "@mui/material"
import { AccountBalanceWallet, Login as LoginIcon, Logout as LogoutIcon, Sync as SyncIcon } from "@mui/icons-material"

const MT5AccountTab = ({
  mt5Form,
  setMt5Form,
  mt5State,
  rememberSession,
  setRememberSession,
  autoReconnect,
  setAutoReconnectLocal,
  handleConnectMT5,
  handleDisconnectMT5,
  loadUserMT5StateFunc,
  clearProfileFunc,
  userId,
}) => {
  const isConnected = !!mt5State.connected
  const account = mt5State.account || null
  const connectStatus = mt5State.status || "idle"
  const connectError = mt5State.error || null

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card
            sx={{
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(0,255,255,0.2)",
              p: 2,
            }}
          >
            <Typography variant="h6" sx={{ color: "#00ffff", mb: 2 }}>
              {"🔌 Conexión a MetaTrader 5"}
            </Typography>
            <Alert severity="info" sx={{ mb: 2, backgroundColor: "rgba(33,150,243,0.1)", color: "#ffffff" }}>
              {"Conecta tu cuenta MT5 (Demo o Real). Los datos se cargan automáticamente al abrir esta ventana."}
            </Alert>

            {connectStatus === "loading" && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: "#00ffff", mb: 1 }}>
                  Cargando datos MT5...
                </Typography>
                <LinearProgress sx={{ "& .MuiLinearProgress-bar": { backgroundColor: "#00ffff" } }} />
              </Box>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                  }}
                />
              }
              label="Recordar perfil (sin contraseña)"
              sx={{ color: "#ffffff", mb: 1 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={autoReconnect}
                  onChange={(e) => setAutoReconnectLocal(e.target.checked)}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                  }}
                />
              }
              label="Auto reconectar al abrir"
              sx={{ color: "#ffffff", mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel sx={{ color: "#00ffff" }}>{"Tipo de Cuenta"}</InputLabel>
              <Select
                value={mt5Form.type}
                onChange={(e) => setMt5Form((prev) => ({ ...prev, type: e.target.value }))}
                sx={{ color: "#ffffff" }}
              >
                <MenuItem value="demo">{"Demo"}</MenuItem>
                <MenuItem value="real">{"Real"}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Servidor (ej: Broker-Demo/Real)"
              value={mt5Form.server}
              onChange={(e) => {
                console.log("[v0] Server value changed:", e.target.value)
                setMt5Form((prev) => ({ ...prev, server: e.target.value }))
              }}
              sx={{
                mb: 2,
                "& .MuiInputLabel-root": { color: "#00ffff" },
                "& .MuiOutlinedInput-root": { color: "#ffffff" },
              }}
            />
            <TextField
              fullWidth
              label="Login (Número de Cuenta)"
              type="text"
              value={mt5Form.login}
              onChange={(e) => {
                console.log("[v0] Login value changed:", e.target.value)
                setMt5Form((prev) => ({ ...prev, login: e.target.value }))
              }}
              sx={{
                mb: 2,
                "& .MuiInputLabel-root": { color: "#00ffff" },
                "& .MuiOutlinedInput-root": { color: "#ffffff" },
              }}
            />
            <TextField
              fullWidth
              label="Contraseña"
              type="password"
              value={mt5Form.password}
              onChange={(e) => {
                console.log("[v0] Password value changed:", e.target.value ? "***" : "empty")
                setMt5Form((prev) => ({ ...prev, password: e.target.value }))
              }}
              sx={{
                mb: 2,
                "& .MuiInputLabel-root": { color: "#00ffff" },
                "& .MuiOutlinedInput-root": { color: "#ffffff" },
              }}
            />
            {connectStatus === "loading" && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress sx={{ "& .MuiLinearProgress-bar": { backgroundColor: "#00ffff" } }} />
              </Box>
            )}
            {connectError && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  backgroundColor: "rgba(244,67,54,0.1)",
                  color: "#ffffff",
                  border: "1px solid rgba(244,67,54,0.3)",
                }}
              >
                {connectError}
              </Alert>
            )}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleConnectMT5}
                disabled={
                  connectStatus === "loading" || !mt5Form.login || !mt5Form.password || !mt5Form.server || !userId
                }
                startIcon={connectStatus === "loading" ? <SyncIcon /> : <LoginIcon />}
                sx={{ minWidth: 140 }}
              >
                {connectStatus === "loading" ? "Conectando..." : "Conectar"}
              </Button>

              <Button
                variant="outlined"
                onClick={() => loadUserMT5StateFunc()}
                disabled={connectStatus === "loading"}
                startIcon={<SyncIcon />}
                sx={{
                  borderColor: "#00ffff",
                  color: "#00ffff",
                  "&:hover": { borderColor: "#00cccc", backgroundColor: "rgba(0,255,255,0.1)" },
                }}
              >
                {"Actualizar cuenta"}
              </Button>

              <Button
                variant="text"
                onClick={handleDisconnectMT5}
                disabled={!isConnected}
                startIcon={<LogoutIcon />}
                sx={{ color: "rgba(255,255,255,0.7)" }}
              >
                {"Desconectar"}
              </Button>

              <Button variant="text" onClick={clearProfileFunc} sx={{ color: "rgba(255,255,255,0.7)" }}>
                {"Eliminar perfil guardado"}
              </Button>
            </Box>

            <Box sx={{ mt: 2, p: 1, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: "#666", display: "block" }}>
                Debug: Server: {mt5Form.server ? "✓" : "✗"} | Login: {mt5Form.login ? "✓" : "✗"} | Password:{" "}
                {mt5Form.password ? "✓" : "✗"} | User: {userId ? "✓" : "✗"}
              </Typography>
              <Typography variant="caption" sx={{ color: "#666", display: "block" }}>
                Estado: {connectStatus} | Conectado: {isConnected ? "Sí" : "No"} | Tipo: {mt5State.account_type}
              </Typography>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card
            sx={{
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(0,255,255,0.2)",
              p: 2,
              height: "100%",
            }}
          >
            <Typography variant="h6" sx={{ color: "#00ffff", mb: 2 }}>
              {"💳 Información de Cuenta"}
            </Typography>
            {!isConnected ? (
              <Box
                sx={{
                  py: 6,
                  textAlign: "center",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <AccountBalanceWallet sx={{ fontSize: 48, opacity: 0.4, mb: 1 }} />
                <Typography>{"Conéctate a una cuenta MT5 para ver tu saldo y detalles."}</Typography>
              </Box>
            ) : account ? (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
                <Card sx={{ p: 2, background: "rgba(0,255,255,0.05)", border: "1px solid rgba(0,255,255,0.2)" }}>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {"Saldo"}
                  </Typography>
                  <Typography variant="h5" sx={{ color: "#00ff88", fontWeight: "bold" }}>
                    {account.currency ? `${account.currency} ` : "$"}
                    {Number(account.balance ?? 0).toLocaleString()}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, background: "rgba(0,255,255,0.05)", border: "1px solid rgba(0,255,255,0.2)" }}>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {"Equidad"}
                  </Typography>
                  <Typography variant="h5" sx={{ color: "#00ffff", fontWeight: "bold" }}>
                    {account.currency ? `${account.currency} ` : "$"}
                    {Number(account.equity ?? 0).toLocaleString()}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {"Margen Libre"}
                  </Typography>
                  <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                    {account.currency ? `${account.currency} ` : "$"}
                    {Number(account.margin_free ?? 0).toLocaleString()}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {"Servidor"}
                  </Typography>
                  <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                    {account.server || "N/D"}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {"Login"}
                  </Typography>
                  <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                    {account.login || "N/D"}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {"Tipo"}
                  </Typography>
                  <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                    {(account.account_type || "demo").toUpperCase()}
                  </Typography>
                </Card>
              </Box>
            ) : (
              <Box sx={{ py: 4 }}>
                <LinearProgress sx={{ "& .MuiLinearProgress-bar": { backgroundColor: "#00ffff" } }} />
              </Box>
            )}
            <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.1)" }} />
            {/* Capital fijado automáticamente desde Saldo MT5 */}
            {isConnected && account?.balance != null && (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <Chip
                  label={`Capital fijado automáticamente: ${
                    account.currency ? account.currency + " " : "$"
                  }${Number(account.balance).toLocaleString()}`}
                  size="small"
                  sx={{ bgcolor: "rgba(0,255,255,0.15)", color: "#00ffff" }}
                />
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default MT5AccountTab
