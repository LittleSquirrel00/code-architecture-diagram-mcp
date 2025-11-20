// Auth module - login functionality
import { UserService } from '../users/UserService'

export function login(username: string, password: string) {
  const user = UserService.findUser(username)
  // Login logic
  return user
}
