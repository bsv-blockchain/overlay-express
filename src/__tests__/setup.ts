// Jest setup file for global test configuration

// Mock uuid to avoid ES module issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}))

// Mock chalk to avoid ANSI color codes in test output
jest.mock('chalk', () => ({
  default: {
    green: { bold: (str: string) => str },
    blue: (str: string) => str,
    yellow: (str: string) => str,
    red: (str: string) => str,
    magenta: { bold: (str: string) => str },
    cyan: (str: string) => str
  },
  green: { bold: (str: string) => str },
  blue: (str: string) => str,
  yellow: (str: string) => str,
  red: (str: string) => str,
  magenta: { bold: (str: string) => str },
  cyan: (str: string) => str
}))

// Suppress console output during tests unless explicitly testing it
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}
