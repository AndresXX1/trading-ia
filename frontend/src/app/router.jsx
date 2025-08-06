import { createBrowserRouter } from 'react-router-dom'
import Layout from '../components/Layout'
import Home from '../pages/Home'
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import Dashboard from '../pages/Dashboard'
import News from '../pages/News'
import Charts from '../pages/Charts.jsx'
import ProtectedRoute from '../components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )
      },
      {
        path: 'dashboard/news',  // ✅ Ruta independiente
        element: (
          <ProtectedRoute>
            <News />
          </ProtectedRoute>
        )
      },
      {
        path: 'dashboard/charts',  // ✅ Ruta independiente  
        element: (
          <ProtectedRoute>
            <Charts />
          </ProtectedRoute>
        )
      }
    ]
  }
])  