// Test file for parser: various import styles

import { foo } from './module-a'
import bar from './module-b'
import * as baz from './module-c'
import type { User } from './types'

export { qux } from './module-d'

// Dynamic import
async function loadModule() {
  const module = await import('./module-e')
  return module
}

export default function main() {
  return foo + bar + baz
}
