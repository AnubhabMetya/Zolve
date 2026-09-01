import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export const ProtectedRoute = ({ children, roles }) => {
  const { session, profile, loading, initialized } = useAuth()

  if (!initialized || loading) {
    return <div className="p-8 text-xs text-slate-500 text-center">Initializing session...</div>
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (roles && roles.length > 0) {
    const userRole = profile?.role
    if (!userRole || !roles.includes(userRole)) {
      return <Navigate to="/" replace />
    }
  }
  return children
}
