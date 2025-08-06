import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loginUser } from '../../features/auth/authSlice'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { status, error } = useSelector(state => state.auth)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await dispatch(loginUser({ email, password }))
    if (result.payload) {
      navigate('/dashboard/charts')
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Iniciar Sesión</h1>
        {error && <div className="mb-4 text-red-500">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded bg-slate-700 border border-slate-600"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-slate-300 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded bg-slate-700 border border-slate-600"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition"
          >
            {status === 'loading' ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>
        
        <div className="mt-4 text-center text-slate-400">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="text-blue-400 hover:underline">
            Regístrate
          </a>
        </div>
      </div>
    </div>
  )
}

export default Login