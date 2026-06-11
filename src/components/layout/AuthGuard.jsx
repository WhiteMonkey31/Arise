import React from 'react'
import { Navigate } from 'react-router'
import { useAuthStore } from '../../store/authStore'

export default function AuthGuard({ children }) {
  const token = useAuthStore((state) => state.token)
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  return children
}