// Auth module - authentication service
import { login } from './login'

export class AuthService {
  authenticate(username: string, password: string) {
    return login(username, password)
  }
}
