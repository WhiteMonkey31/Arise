/**
 * Auth store (Zustand).
 *
 * Holds the JWT token, user profile, and org info.
 * The `setAuth` action is called by useAuth after a successful backend login.
 * The legacy `login` mock is kept so the app still works in offline/demo mode
 * if VITE_API_BASE_URL is not configured.
 */

import { create } from 'zustand'

export const useAuthStore = create((set) => {
  const savedToken = localStorage.getItem('auth_token')
  return {
    user: savedToken
      ? {
          name: 'Sarah Jenkins',
          email: 'sarah.j@acme-consulting.com',
          role: 'Bid Manager',
          avatar: 'SJ',
        }
      : null,
    organization: savedToken
      ? { name: 'Acme Consulting Group', industry: 'Enterprise Technology Services' }
      : null,
    token: savedToken || null,

    /** Called by useAuth hook after real backend authentication */
    setAuth: ({ token, user, organization }) => {
      set({ token, user, organization })
    },

    /** Legacy mock login — used as fallback when backend is unavailable */
    login: (email, password) => {
      const mockToken = 'mock-jwt-token-123456'
      set({
        token: mockToken,
        user: {
          name: 'Sarah Jenkins',
          email,
          role: 'Bid Manager',
          avatar: 'SJ',
        },
        organization: {
          name: 'Acme Consulting Group',
          industry: 'Enterprise Technology Services',
        },
      })
      localStorage.setItem('auth_token', mockToken)
    },

    logout: () => {
      set({ token: null, user: null, organization: null })
      localStorage.removeItem('auth_token')
    },
  }
})
