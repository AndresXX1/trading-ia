import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { Toaster } from 'react-hot-toast'
import { checkAuth } from './features/auth/authSlice'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(checkAuth())
  }, [dispatch])

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </div>
  )
}

export default App