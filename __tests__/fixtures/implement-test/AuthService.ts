import { IAuth } from './IAuth'

/**
 * Single interface implementation
 */
export class AuthService implements IAuth {
  async login(username: string, password: string): Promise<boolean> {
    return username === 'admin'
  }

  logout(): void {
    console.log('Logged out')
  }
}
