import { resolveImportPath } from './src/graph/builder.js'

const result = resolveImportPath(
  '/project/src/index.ts',
  './utils'
)

console.log('Resolved:', result)
console.log('Expected something like: /project/src/utils.ts')
