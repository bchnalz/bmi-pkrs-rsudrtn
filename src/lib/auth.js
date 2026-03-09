const AUTH_KEY = 'pkrs_admin_auth'

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'pkrsrtnotopuro123',
}

export function login(username, password) {
  const isValid =
    username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password
  if (!isValid) return false

  sessionStorage.setItem(AUTH_KEY, '1')
  return true
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY)
}

export function isAuthenticated() {
  return sessionStorage.getItem(AUTH_KEY) === '1'
}
