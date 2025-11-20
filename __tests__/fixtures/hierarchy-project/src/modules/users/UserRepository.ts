// Users module - user repository
import { UserService } from './UserService'

export class UserRepository {
  getUser(id: number) {
    return UserService.findUser('user' + id)
  }
}
