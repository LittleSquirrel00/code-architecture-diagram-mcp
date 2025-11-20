/**
 * Authentication interface
 */
export interface IAuth {
  login(username: string, password: string): Promise<boolean>
  logout(): void
}
