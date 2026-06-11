import { create } from 'zustand'

export const useAuthStore = create((set) => {
  const savedToken = localStorage.getItem('auth_token')
  return {
    user: savedToken ? {
      name: 'Sarah Jenkins',
      email: 'sarah.j@acme-consulting.com',
      role: 'Bid Manager',
      avatar: 'SJ'
    } : null,
    organization: savedToken ? {
      name: 'Acme Consulting Group',
      industry: 'Enterprise Technology Services'
    } : null,
    token: savedToken || null,
    login: (email, password) => {
      const mockToken = 'mock-jwt-token-123456'
      set({ 
        token: mockToken, 
        user: { 
          name: 'Sarah Jenkins', 
          email, 
          role: 'Bid Manager', 
          avatar: 'SJ' 
        },
        organization: {
          name: 'Acme Consulting Group',
          industry: 'Enterprise Technology Services'
        }
      })
      localStorage.setItem('auth_token', mockToken)
    },
    logout: () => {
      set({ token: null, user: null, organization: null })
      localStorage.removeItem('auth_token')
    }
  }
})
