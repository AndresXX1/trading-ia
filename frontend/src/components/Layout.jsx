import React, { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../features/auth/authSlice'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Box,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material'
import {
  TrendingUp,
  BarChart,
  Article,
  Home,
  Logout,
  Person,
  Menu as MenuIcon,
  Close,
  SmartToy,
  AccountBalanceWallet,
  Timeline,
  FiberManualRecord
} from '@mui/icons-material'
import './layout.css'

const Layout = () => {
  const { user, token } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  const [anchorEl, setAnchorEl] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
    setAnchorEl(null)
  }

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const navigationItems = [
    { name: 'Inicio', href: '/', icon: <Home /> },
    ...(token ? [
      { name: 'Dashboard', href: '/dashboard', icon: <BarChart /> },
      { name: 'Noticias', href: '/dashboard/news', icon: <Article /> },
      { name: 'Gráficos', href: '/dashboard/charts', icon: <TrendingUp /> },
    ] : [])
  ]

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box className="logo-container">
          <SmartToy sx={{ color: 'white' }} />
        </Box>
        <Typography variant="h6" className="brand-text">
          Trading IA
        </Typography>
      </Box>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton 
              component={Link} 
              to={item.href}
              onClick={() => setMobileOpen(false)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  return (
    <Box className="layout-container">
      {/* Navigation Header */}
      <AppBar position="sticky" className="navbar">
        <Toolbar>
          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo/Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: isMobile ? 1 : 0 }}>
            <Box className="logo-container">
              <SmartToy sx={{ color: 'white' }} />
            </Box>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Typography variant="h5" className="brand-text">
                Trading IA
              </Typography>
            </Link>
            <Chip 
              label="Pro" 
              size="small" 
              className="pro-badge"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            />
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, ml: 4 }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.name}
                  component={Link}
                  to={item.href}
                  startIcon={item.icon}
                  className="nav-button"
                  sx={{ color: 'rgba(255,255,255,0.8)', textTransform: 'none' }}
                >
                  {item.name}
                </Button>
              ))}
            </Box>
          )}

          {/* User Menu / Auth Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {token ? (
              <>
                {/* Market Status */}
                <Box className="market-status" sx={{ display: { xs: 'none', sm: 'flex' } }}>
                  <FiberManualRecord className="pulse-dot" />
                  <Typography variant="caption">Mercado Abierto</Typography>
                </Box>

                {/* User Avatar */}
                <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0 }}>
                  <Avatar className="user-avatar">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </Avatar>
                </IconButton>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  className="user-menu"
                >
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle2">
                      {user?.name || 'Usuario'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {user?.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={handleMenuClose}>
                    <Person sx={{ mr: 2 }} />
                    Perfil
                  </MenuItem>
                  <MenuItem onClick={handleMenuClose}>
                    <AccountBalanceWallet sx={{ mr: 2 }} />
                    Billetera
                  </MenuItem>
                  <MenuItem onClick={handleMenuClose}>
                    <Timeline sx={{ mr: 2 }} />
                    Actividad
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                    <Logout sx={{ mr: 2 }} />
                    Cerrar Sesión
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  component={Link} 
                  to="/login" 
                  color="inherit"
                  sx={{ textTransform: 'none' }}
                >
                  Iniciar Sesión
                </Button>
                <Button 
                  component={Link} 
                  to="/register" 
                  variant="contained"
                  className="register-button"
                  sx={{ textTransform: 'none' }}
                >
                  Registrarse
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box component="main" className="main-content">
        <Outlet />
      </Box>

      {/* Footer */}
      <Box component="footer" className="footer">
        <Container maxWidth="lg">
          <Box className="footer-content">
            {/* Brand Section */}
            <Box className="footer-brand">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box className="logo-container">
                  <SmartToy sx={{ color: 'white' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                  Trading IA
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, maxWidth: 400 }}>
                Plataforma de trading inteligente impulsada por IA. Toma decisiones informadas 
                con análisis avanzados y predicciones precisas del mercado.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FiberManualRecord className="pulse-dot" sx={{ fontSize: 8 }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  Sistema Activo
                </Typography>
              </Box>
            </Box>

            {/* Quick Links */}
            <Box>
              <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 'bold' }}>
                Enlaces Rápidos
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link to="/about" className="footer-link">Acerca de</Link>
                <Link to="/features" className="footer-link">Características</Link>
                <Link to="/pricing" className="footer-link">Precios</Link>
                <Link to="/support" className="footer-link">Soporte</Link>
              </Box>
            </Box>

            {/* Legal */}
            <Box>
              <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 'bold' }}>
                Legal
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link to="/privacy" className="footer-link">Privacidad</Link>
                <Link to="/terms" className="footer-link">Términos</Link>
                <Link to="/disclaimer" className="footer-link">Disclaimer</Link>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.2)' }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              © 2024 Trading IA. Todos los derechos reservados. | Desarrollado con ❤️ para traders inteligentes
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}

export default Layout
