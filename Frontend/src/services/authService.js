/**
 * Auth service — login (OAuth2 password form), register, get current user.
 *
 * Backend endpoints:
 *   POST /api/auth/token    → { access_token, token_type, user_id, org_id, role }
 *   POST /api/auth/register → UserResponse
 *   GET  /api/auth/me       → UserResponse
 */

import api from './api'

/**
 * Login with email + password.
 * The backend uses OAuth2PasswordRequestForm, so the body must be
 * application/x-www-form-urlencoded with username/password fields.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ access_token, user_id, org_id, role }>}
 */
export async function login(email, password) {
  const params = new URLSearchParams()
  params.append('username', email)
  params.append('password', password)

  const { data } = await api.post('/api/auth/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

/**
 * Register a new organization + admin user.
 *
 * @param {{ email, password, org_name, role? }} payload
 * @returns {Promise<UserResponse>}
 */
export async function register(payload) {
  const { data } = await api.post('/api/auth/register', payload)
  return data
}

/**
 * Fetch the currently authenticated user's profile.
 * @returns {Promise<UserResponse>}
 */
export async function getMe() {
  const { data } = await api.get('/api/auth/me')
  return data
}
