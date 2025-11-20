/**
 * Unit tests for render edge detection (Phase 4)
 */

import { describe, test, expect } from '@jest/globals'
import { parseProject } from '../src/parser/typescript-parser.js'

describe('Phase 4: Render Edge Detection', () => {
  const fixturesDir = '__tests__/fixtures/render-test'

  describe('Parser: extractRenders', () => {
    test('should detect JSX components in Dashboard', async () => {
      const files = await parseProject(fixturesDir)
      const dashboard = files.find(f => f.path.includes('Dashboard.tsx'))

      expect(dashboard).toBeDefined()
      expect(dashboard?.renders).toBeDefined()
      expect(dashboard?.renders?.length).toBeGreaterThan(0)

      // Dashboard renders Header, Sidebar, Footer
      const componentNames = dashboard?.renders?.map(r => r.componentName) || []
      expect(componentNames).toContain('Header')
      expect(componentNames).toContain('Sidebar')
      expect(componentNames).toContain('Footer')
    })

    test('should detect JSX components in Sidebar', async () => {
      const files = await parseProject(fixturesDir)
      const sidebar = files.find(f => f.path.includes('Sidebar.tsx'))

      expect(sidebar).toBeDefined()
      expect(sidebar?.renders).toBeDefined()
      expect(sidebar?.renders?.length).toBe(1)

      const render = sidebar?.renders?.[0]
      expect(render?.componentName).toBe('UserCard')
      expect(render?.position).toBe(0)
      expect(render?.isNamespaced).toBe(false)
    })

    test('should track rendering positions', async () => {
      const files = await parseProject(fixturesDir)
      const dashboard = files.find(f => f.path.includes('Dashboard.tsx'))

      const renders = dashboard?.renders || []
      expect(renders.length).toBeGreaterThanOrEqual(3)

      // Positions should be sequential: 0, 1, 2, ...
      const positions = renders.map(r => r.position)
      expect(positions).toEqual([0, 1, 2])
    })

    test('should ignore HTML elements', async () => {
      const files = await parseProject(fixturesDir)
      const header = files.find(f => f.path.includes('Header.tsx'))

      // Header only contains <header> and <h1> (HTML elements)
      // Should not extract any component renders
      expect(header?.renders).toBeUndefined()
    })

    test('should handle components with no renders', async () => {
      const files = await parseProject(fixturesDir)
      const footer = files.find(f => f.path.includes('Footer.tsx'))

      // Footer has no component renders (only HTML)
      expect(footer?.renders).toBeUndefined()
    })
  })
})
