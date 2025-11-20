/**
 * Tests for hierarchy detection
 */

import { describe, it, expect } from '@jest/globals'
import {
  detectHierarchy,
  getParentId,
  getParentLabel,
} from '../src/parser/hierarchy-detector.js'

describe('Hierarchy Detector', () => {
  describe('Module detection', () => {
    it('should detect module from modules/ directory', () => {
      const result = detectHierarchy('/proj/src/modules/auth/login.ts')

      expect(result.level).toBe('module')
      expect(result.parent).toBe('src/modules/auth')
    })

    it('should detect module from features/ directory', () => {
      const result = detectHierarchy('/proj/src/features/dashboard/index.ts')

      expect(result.level).toBe('module')
      expect(result.parent).toBe('src/features/dashboard')
    })

    it('should handle nested files in modules', () => {
      const result = detectHierarchy(
        '/proj/src/modules/auth/services/login-service.ts'
      )

      expect(result.level).toBe('module')
      expect(result.parent).toBe('src/modules/auth')
    })

    it('should handle Windows paths', () => {
      const result = detectHierarchy('C:\\proj\\src\\modules\\users\\user.ts')

      expect(result.level).toBe('module')
      expect(result.parent).toBe('src/modules/users')
    })
  })

  describe('Component detection', () => {
    it('should detect component from components/ directory', () => {
      const result = detectHierarchy('/proj/src/components/Button/Button.tsx')

      expect(result.level).toBe('component')
      expect(result.parent).toBe('src/components/Button')
    })

    it('should detect component from ui/ directory', () => {
      const result = detectHierarchy('/proj/src/ui/Input/index.tsx')

      expect(result.level).toBe('component')
      expect(result.parent).toBe('src/ui/Input')
    })

    it('should handle nested component files', () => {
      const result = detectHierarchy(
        '/proj/src/components/Button/styles/button.css'
      )

      expect(result.level).toBe('component')
      expect(result.parent).toBe('src/components/Button')
    })
  })

  describe('File-level fallback', () => {
    it('should return file level for utils directory', () => {
      const result = detectHierarchy('/proj/src/utils/helpers.ts')

      expect(result.level).toBe('file')
      expect(result.parent).toBeUndefined()
    })

    it('should return file level for lib directory', () => {
      const result = detectHierarchy('/proj/src/lib/api.ts')

      expect(result.level).toBe('file')
      expect(result.parent).toBeUndefined()
    })

    it('should return file level for root-level files', () => {
      const result = detectHierarchy('/proj/src/index.ts')

      expect(result.level).toBe('file')
      expect(result.parent).toBeUndefined()
    })

    it('should return file level for files outside src/', () => {
      const result = detectHierarchy('/proj/config.ts')

      expect(result.level).toBe('file')
      expect(result.parent).toBeUndefined()
    })
  })

  describe('Priority order', () => {
    it('should prioritize module over component for ambiguous paths', () => {
      // This is a theoretical edge case: modules/auth/components/LoginForm.tsx
      const result = detectHierarchy(
        '/proj/src/modules/auth/components/LoginForm.tsx'
      )

      // Should detect as module (modules/ pattern comes first)
      expect(result.level).toBe('module')
      expect(result.parent).toBe('src/modules/auth')
    })
  })

  describe('Edge cases', () => {
    it('should handle index files', () => {
      const result = detectHierarchy('/proj/src/modules/users/index.ts')

      expect(result.level).toBe('module')
      expect(result.parent).toBe('src/modules/users')
    })

    it('should handle paths with no src/ directory', () => {
      const result = detectHierarchy('/proj/modules/auth/login.ts')

      expect(result.level).toBe('file')
      expect(result.parent).toBeUndefined()
    })

    it('should handle relative paths', () => {
      const result = detectHierarchy('src/modules/auth/login.ts')

      expect(result.level).toBe('module')
      expect(result.parent).toBe('src/modules/auth')
    })
  })

  describe('Helper functions', () => {
    it('should generate correct parent ID for module', () => {
      const id = getParentId('src/modules/auth', 'module')
      expect(id).toBe('module:src/modules/auth')
    })

    it('should generate correct parent ID for component', () => {
      const id = getParentId('src/components/Button', 'component')
      expect(id).toBe('component:src/components/Button')
    })

    it('should generate readable label from parent path', () => {
      const label = getParentLabel('src/modules/auth')
      expect(label).toBe('modules/auth')
    })

    it('should generate readable label for components', () => {
      const label = getParentLabel('src/components/Button')
      expect(label).toBe('components/Button')
    })

    it('should handle paths without src/', () => {
      const label = getParentLabel('modules/auth')
      expect(label).toBe('modules/auth')
    })
  })

  describe('Accuracy validation', () => {
    // Test against realistic project structures
    const testCases = [
      // React project
      { path: 'src/modules/auth/Login.tsx', expected: 'module' },
      { path: 'src/modules/users/UserList.tsx', expected: 'module' },
      { path: 'src/components/Button/index.tsx', expected: 'component' },
      { path: 'src/components/Input/Input.tsx', expected: 'component' },
      { path: 'src/utils/helpers.ts', expected: 'file' },
      { path: 'src/hooks/useAuth.ts', expected: 'file' },

      // Next.js project
      { path: 'src/features/posts/PostList.tsx', expected: 'module' },
      { path: 'src/features/comments/CommentForm.tsx', expected: 'module' },
      { path: 'src/ui/Card/Card.tsx', expected: 'component' },
      { path: 'src/lib/api.ts', expected: 'file' },

      // Nested structures
      { path: 'src/modules/auth/services/authService.ts', expected: 'module' },
      {
        path: 'src/components/Form/fields/TextField.tsx',
        expected: 'component',
      },
    ]

    it('should achieve ≥90% accuracy on realistic project structures', () => {
      let correct = 0

      for (const testCase of testCases) {
        const result = detectHierarchy(testCase.path)
        if (result.level === testCase.expected) {
          correct++
        }
      }

      const accuracy = (correct / testCases.length) * 100
      expect(accuracy).toBeGreaterThanOrEqual(90)
      expect(correct).toBe(testCases.length) // Should be 100% for these cases
    })
  })
})
