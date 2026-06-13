/**
 * useAuth — combines Zustand auth state with real backend mutations.
 *
 * Exposes:
 *   user, token, organization        — from authStore
 *   login(email, password)           — calls /api/auth/token, stores token, fetches /api/auth/me
 *   register(payload)                — calls /api/auth/register then logs in
 *   logout()                         — clears state + localStorage
 *   isLoading, error                 — mutation state
 */

import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import * as authService from '../services/authService'

export function useAuth() {
  const { user, token, organization, setAuth, logout: storeLogout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  async function login(email, password) {
    setIsLoading(true)
    setError(null)
    try {
      const tokenData = await authService.login(email, password)
      // Persist JWT
      localStorage.setItem('auth_token', tokenData.access_token)

      // Fetch full user profile
      const me = await authService.getMe()

      setAuth({
        token: tokenData.access_token,
        user: {
          id: me.id,
          email: me.email,
          role: me.role,
          // name/avatar not in backend response — derive from email
          name: me.email.split('@')[0],
          avatar: me.email.slice(0, 2).toUpperCase(),
        },
        // org_id available from token payload; name fetched separately if needed
        organization: { id: me.org_id },
      })
      return me
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  async function register(payload) {
    setIsLoading(true)
    setError(null)
    try {
      await authService.register(payload)
      // Auto-login after registration
      return await login(payload.email, payload.password)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('auth_token')
    storeLogout()
  }

  return { user, token, organization, login, register, logout, isLoading, error }
}
