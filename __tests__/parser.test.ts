import { describe, test, expect, beforeAll } from '@jest/globals'
import { parseFile, parseProject, createParser } from '../src/parser/typescript-parser.js'
import type Parser from 'tree-sitter'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('TypeScript Parser', () => {
  let parser: Parser

  beforeAll(() => {
    parser = createParser()
  })

  describe('parseFile', () => {
    test('should extract named imports', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'sample.ts')
      const result = await parseFile(fixturePath, parser)

      expect(result).not.toBeNull()
      expect(result?.path).toBe(fixturePath)
      expect(result?.imports).toBeDefined()

      // Should find import { foo } from './module-a'
      const namedImport = result?.imports.find((i) => i.importPath === './module-a')
      expect(namedImport).toBeDefined()
      expect(namedImport?.isTypeOnly).toBe(false)
      expect(namedImport?.isDynamic).toBe(false)
    })

    test('should extract default imports', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'sample.ts')
      const result = await parseFile(fixturePath, parser)

      // Should find import bar from './module-b'
      const defaultImport = result?.imports.find((i) => i.importPath === './module-b')
      expect(defaultImport).toBeDefined()
    })

    test('should extract namespace imports', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'sample.ts')
      const result = await parseFile(fixturePath, parser)

      // Should find import * as baz from './module-c'
      const namespaceImport = result?.imports.find((i) => i.importPath === './module-c')
      expect(namespaceImport).toBeDefined()
    })

    test('should flag type-only imports', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'sample.ts')
      const result = await parseFile(fixturePath, parser)

      // Should find import type { User } from './types'
      const typeImport = result?.imports.find((i) => i.importPath === './types')
      expect(typeImport).toBeDefined()
      expect(typeImport?.isTypeOnly).toBe(true)
    })

    test('should extract re-exports', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'sample.ts')
      const result = await parseFile(fixturePath, parser)

      // Should find export { qux } from './module-d'
      const reExport = result?.imports.find((i) => i.importPath === './module-d')
      expect(reExport).toBeDefined()
    })

    test('should extract dynamic imports', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'sample.ts')
      const result = await parseFile(fixturePath, parser)

      // Should find import('./module-e')
      const dynamicImport = result?.imports.find((i) => i.importPath === './module-e')
      expect(dynamicImport).toBeDefined()
      expect(dynamicImport?.isDynamic).toBe(true)
    })

    test('should return null for non-existent file', async () => {
      const result = await parseFile('/non/existent/file.ts', parser)
      expect(result).toBeNull()
    })
  })

  describe('parseProject', () => {
    test('should scan fixture directory', async () => {
      const fixturesDir = path.join(__dirname, 'fixtures')
      const results = await parseProject(fixturesDir)

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].path).toContain('fixtures')
    })

    test('should ignore node_modules', async () => {
      // This test assumes no node_modules in fixtures
      const fixturesDir = path.join(__dirname, 'fixtures')
      const results = await parseProject(fixturesDir)

      const hasNodeModules = results.some((r) => r.path.includes('node_modules'))
      expect(hasNodeModules).toBe(false)
    })
  })
})
