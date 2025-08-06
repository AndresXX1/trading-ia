import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { registerUser } from '../../features/auth/authSlice'
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
  Divider,
  Checkbox,
  FormControlLabel,
  LinearProgress
} from '@mui/material'
import {
  Person,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  PersonAdd,
  SmartToy,
  Login as LoginIcon,
  CheckCircle,
  Cancel
} from '@mui/icons-material'
import './register.css'

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { status, error, token } = useSelector((state) => state.auth)

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (token) {
      navigate('/login')
    }
  }, [token, navigate])

  // Calcular fuerza de contraseña
  const calculatePasswordStrength = (password) => {
    let strength = 0
    if (password.length >= 6) strength += 25
    if (password.length >= 8) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/[0-9]/.test(password)) strength += 25
    return strength
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Calcular fuerza de contraseña
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value))
    }

    // Limpiar error específico cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Validar nombre
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres'
    }

    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido'
    }

    // Validar contraseña
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida'
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    // Validar confirmación de contraseña
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }

    // Validar términos
    if (!termsAccepted) {
      newErrors.terms = 'Debes aceptar los términos y condiciones'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const userData = {
      username: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password
    }

    try {
      await dispatch(registerUser(userData)).unwrap()
      // Si el registro es exitoso, el useEffect redirigirá automáticamente
    } catch (err) {
      console.error('Error en registro:', err)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return '#ff4444'
    if (passwordStrength < 50) return '#ff8800'
    if (passwordStrength < 75) return '#ffaa00'
    return '#00ff88'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Muy débil'
    if (passwordStrength < 50) return 'Débil'
    if (passwordStrength < 75) return 'Media'
    return 'Fuerte'
  }

  const isLoading = status === 'loading'

  return (
    <Box className="register-container">
      <Container maxWidth="sm">
        <Box sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          py: 4
        }}>
          <Paper className="register-paper" elevation={0}>
            {/* Logo y Título */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box className="register-logo">
                <SmartToy sx={{ fontSize: 40, color: '#000' }} />
              </Box>
              <Typography variant="h4" className="register-title" sx={{ mt: 2, mb: 1 }}>
                Únete a Trading IA
              </Typography>
              <Typography variant="body1" className="register-subtitle">
                Comienza tu revolución en el trading inteligente
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                className="register-error"
                sx={{ mb: 3 }}
              >
                {error}
              </Alert>
            )}

            {/* Formulario */}
            <Box component="form" onSubmit={handleSubmit}>
              {/* Campo Nombre */}
              <TextField
                fullWidth
                name="name"
                label="Nombre Completo"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                required
                className="register-input"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person className="input-icon" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              {/* Campo Email */}
              <TextField
                fullWidth
                type="email"
                name="email"
                label="Correo Electrónico"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                required
                className="register-input"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email className="input-icon" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              {/* Campo Contraseña */}
              <TextField
                fullWidth
                name="password"
                type={showPassword ? 'text' : 'password'}
                label="Contraseña"
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                required
                className="register-input"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock className="input-icon" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        className="password-toggle"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              {/* Indicador de fuerza de contraseña */}
              {formData.password && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Fuerza de contraseña
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ color: getPasswordStrengthColor(), fontWeight: 'bold' }}
                    >
                      {getPasswordStrengthText()}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength}
                    className="password-strength"
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getPasswordStrengthColor(),
                        borderRadius: 3,
                      }
                    }}
                  />
                </Box>
              )}

              {/* Campo Confirmar Contraseña */}
              <TextField
                fullWidth
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                label="Confirmar Contraseña"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                required
                className="register-input"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock className="input-icon" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        className="password-toggle"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                      {formData.confirmPassword && (
                        <Box sx={{ ml: 1 }}>
                          {formData.password === formData.confirmPassword ? (
                            <CheckCircle sx={{ color: '#00ff88', fontSize: 20 }} />
                          ) : (
                            <Cancel sx={{ color: '#ff4444', fontSize: 20 }} />
                          )}
                        </Box>
                      )}
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              {/* Términos y condiciones */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="terms-checkbox"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Acepto los{' '}
                    <Link to="/terms" className="terms-link">
                      términos y condiciones
                    </Link>
                    {' '}y la{' '}
                    <Link to="/privacy" className="terms-link">
                      política de privacidad
                    </Link>
                  </Typography>
                }
                sx={{ mb: 3, alignItems: 'flex-start' }}
              />
              {errors.terms && (
                <Typography variant="caption" sx={{ color: '#ff4444', display: 'block', mt: -2, mb: 2 }}>
                  {errors.terms}
                </Typography>
              )}

              {/* Botón de registro */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                className="register-button"
                startIcon={isLoading ? <CircularProgress size={20} /> : <PersonAdd />}
                sx={{ mb: 3, py: 1.5 }}
              >
                {isLoading ? 'Creando Cuenta...' : 'Crear Cuenta'}
              </Button>
            </Box>

            <Divider className="register-divider" sx={{ my: 3 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                ¿Ya tienes cuenta?
              </Typography>
            </Divider>

            {/* Link de Login */}
            <Box sx={{ textAlign: 'center' }}>
              <Button
                component={Link}
                to="/login"
                variant="outlined"
                startIcon={<LoginIcon />}
                className="login-link-button"
                fullWidth
              >
                Iniciar Sesión
              </Button>
            </Box>

            {/* Footer del formulario */}
            <Box sx={{ textAlign: 'center', mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Al registrarte, te unes a más de 15,000 traders que confían en nuestra IA
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}

export default Register
