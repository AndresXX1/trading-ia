import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loginUser } from '../../features/auth/authSlice'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider
} from '@mui/material'
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  SmartToy,
  PersonAdd
} from '@mui/icons-material'
import './login.css'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { status, error } = useSelector(state => state.auth)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await dispatch(loginUser({ email, password }))
    if (result.payload) {
      navigate('/')
    }
  }

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword)
  }

  return (
    <Box className="login-container">
      <Container maxWidth="sm">
        <Box sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          py: 4
        }}>
          <Paper className="login-paper" elevation={0}>
            {/* Logo y Título */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box className="login-logo">
                <SmartToy sx={{ fontSize: 40, color: '#000' }} />
              </Box>
              <Typography variant="h4" className="login-title" sx={{ mt: 2, mb: 1 }}>
                Bienvenido de Vuelta
              </Typography>
              <Typography variant="body1" className="login-subtitle">
                Accede a tu plataforma de trading inteligente
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                className="login-error"
                sx={{ mb: 3 }}
              >
                {error}
              </Alert>
            )}

            {/* Formulario */}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                type="email"
                label="Correo Electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="login-input"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email className="input-icon" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login-input"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock className="input-icon" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClickShowPassword}
                        edge="end"
                        className="password-toggle"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 4 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={status === 'loading'}
                className="login-button"
                startIcon={status === 'loading' ? <CircularProgress size={20} /> : <LoginIcon />}
                sx={{ mb: 3, py: 1.5 }}
              >
                {status === 'loading' ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
              </Button>
            </Box>

            <Divider className="login-divider" sx={{ my: 3 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                ¿Primera vez aquí?
              </Typography>
            </Divider>

            {/* Link de Registro */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                ¿No tienes una cuenta?
              </Typography>
              <Button
                component={Link}
                to="/register"
                variant="outlined"
                startIcon={<PersonAdd />}
                className="register-link-button"
                fullWidth
              >
                Crear Cuenta Nueva
              </Button>
            </Box>

            {/* Footer del formulario */}
            <Box sx={{ textAlign: 'center', mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Al iniciar sesión, aceptas nuestros{' '}
                <Link to="/terms" className="footer-link">
                  Términos de Servicio
                </Link>
                {' '}y{' '}
                <Link to="/privacy" className="footer-link">
                  Política de Privacidad
                </Link>
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}

export default Login
