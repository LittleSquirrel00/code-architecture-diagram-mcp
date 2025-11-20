import { IAuth } from './IAuth'
import { ILogger } from './ILogger'

/**
 * Multiple interface implementations
 */
export class UserService implements IAuth, ILogger {
  async login(username: string, password: string): Promise<boolean> {
    this.log(`Login attempt: ${username}`)
    return true
  }

  logout(): void {
    this.log('User logged out')
  }

  log(message: string): void {
    console.log(`[INFO] ${message}`)
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`)
  }
}
