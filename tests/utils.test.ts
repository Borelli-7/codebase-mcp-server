import { describe, it, expect } from 'vitest';
import { detectLanguage, matchesPattern, LANGUAGE_MAP } from '../src/utils.js';

describe('utils', () => {
  describe('detectLanguage', () => {
    it('should detect TypeScript files', () => {
      expect(detectLanguage('test.ts')).toBe('typescript');
      expect(detectLanguage('component.tsx')).toBe('typescript');
    });

    it('should detect JavaScript files', () => {
      expect(detectLanguage('script.js')).toBe('javascript');
      expect(detectLanguage('component.jsx')).toBe('javascript');
    });

    it('should detect Python files', () => {
      expect(detectLanguage('script.py')).toBe('python');
    });

    it('should return unknown for unsupported extensions', () => {
      expect(detectLanguage('file.xyz')).toBe('unknown');
      expect(detectLanguage('noextension')).toBe('unknown');
    });

    it('should handle paths with directories', () => {
      expect(detectLanguage('src/components/Button.tsx')).toBe('typescript');
    });
  });

  describe('matchesPattern', () => {
    it('should match exact filenames', () => {
      expect(matchesPattern('test.ts', 'test.ts')).toBe(true);
      expect(matchesPattern('test.js', 'test.ts')).toBe(false);
    });

    it('should match wildcard patterns', () => {
      expect(matchesPattern('test.ts', '*.ts')).toBe(true);
      expect(matchesPattern('component.tsx', '*.tsx')).toBe(true);
      expect(matchesPattern('test.js', '*.ts')).toBe(false);
    });

    it('should match multiple wildcards', () => {
      expect(matchesPattern('test.spec.ts', '*.spec.ts')).toBe(true);
      expect(matchesPattern('component.test.tsx', '*.test.tsx')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(matchesPattern('Test.TS', '*.ts')).toBe(true);
      expect(matchesPattern('FILE.TXT', 'file.txt')).toBe(true);
    });
  });

  describe('LANGUAGE_MAP', () => {
    it('should contain common language mappings', () => {
      expect(LANGUAGE_MAP['.ts']).toBe('typescript');
      expect(LANGUAGE_MAP['.js']).toBe('javascript');
      expect(LANGUAGE_MAP['.py']).toBe('python');
      expect(LANGUAGE_MAP['.java']).toBe('java');
      expect(LANGUAGE_MAP['.go']).toBe('go');
      expect(LANGUAGE_MAP['.rs']).toBe('rust');
      expect(LANGUAGE_MAP['.md']).toBe('markdown');
    });

    it('should have at least 30 language mappings', () => {
      expect(Object.keys(LANGUAGE_MAP).length).toBeGreaterThanOrEqual(30);
    });
  });
});
