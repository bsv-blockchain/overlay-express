import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { JanitorService } from '../JanitorService.js'
import { Db } from 'mongodb'

// Mock fetch globally
global.fetch = jest.fn() as any

describe('JanitorService', () => {
  let mockDb: Db
  let mockCollection: any
  let mockLogger: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockCollection = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      }),
      updateOne: jest.fn().mockResolvedValue({}),
      deleteOne: jest.fn().mockResolvedValue({})
    }

    // @ts-expect-error - Mocking Db for testing
    mockDb = {
      // @ts-expect-error - Mock collection method
      collection: jest.fn().mockReturnValue(mockCollection)
    }

    mockLogger = {
      log: jest.fn(),
      error: jest.fn()
    }
  })

  describe('constructor', () => {
    it('should create instance with required config', () => {
      const janitor = new JanitorService({
        mongoDb: mockDb
      })

      expect(janitor).toBeInstanceOf(JanitorService)
    })

    it('should use default values when not provided', () => {
      const janitor = new JanitorService({
        mongoDb: mockDb
      })

      expect(janitor).toBeDefined()
    })

    it('should use custom logger when provided', () => {
      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      expect(janitor).toBeDefined()
    })

    it('should use custom timeout and revoke score', () => {
      const janitor = new JanitorService({
        mongoDb: mockDb,
        requestTimeoutMs: 5000,
        hostDownRevokeScore: 5
      })

      expect(janitor).toBeDefined()
    })
  })

  describe('run', () => {
    it('should check both SHIP and SLAP collections', async () => {
      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(mockDb.collection).toHaveBeenCalledWith('shipRecords')
      expect(mockDb.collection).toHaveBeenCalledWith('slapRecords')
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Running janitor'))
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('completed'))
    })

    it('should handle errors during health checks', async () => {
      // @ts-expect-error - Mocking error
      mockDb.collection = jest.fn().mockImplementation(() => {
        throw new Error('Database error')
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await expect(janitor.run()).rejects.toThrow('Database error')
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should process empty collections without errors', async () => {
      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('completed'))
    })
  })

  describe('output processing', () => {
    it('should process output with domain field', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'https://example.com',
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        // @ts-expect-error - Mock json method
        json: jest.fn().mockResolvedValue({ status: 'ok' })
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should process output with url field', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        url: 'https://example.com',
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        // @ts-expect-error - Mock json method
        json: jest.fn().mockResolvedValue({ status: 'ok' })
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should process output with serviceURL field', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        serviceURL: 'https://example.com',
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        // @ts-expect-error - Mock json method
        json: jest.fn().mockResolvedValue({ status: 'ok' })
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should process output with protocols array', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        protocols: ['https://example.com', 'http://other.com'],
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        // @ts-expect-error - Mock json method
        json: jest.fn().mockResolvedValue({ status: 'ok' })
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should skip output without valid URL', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('domain validation', () => {
    it('should accept valid domain', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'https://valid-domain.com',
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        // @ts-expect-error - Mock json method
        json: jest.fn().mockResolvedValue({ status: 'ok' })
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should reject invalid domain and increment down counter', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'invalid domain!@#',
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: '123' },
        { $inc: { down: 1 } }
      )
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Invalid domain'))
    })

    it('should accept localhost', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'http://localhost:3000',
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        // @ts-expect-error - Mock json method
        json: jest.fn().mockResolvedValue({ status: 'ok' })
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should accept IP address', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'http://192.168.1.1',
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        // @ts-expect-error - Mock json method
        json: jest.fn().mockResolvedValue({ status: 'ok' })
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe('health check', () => {
    it('should mark output as healthy when health check passes', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'https://example.com',
        down: 2
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        // @ts-expect-error - Mock json method
        json: jest.fn().mockResolvedValue({ status: 'ok' })
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: '123' },
        { $inc: { down: -1 } }
      )
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('is healthy'))
    })

    it('should not decrement when already at 0', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'https://example.com',
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        // @ts-expect-error - Mock json method
        json: jest.fn().mockResolvedValue({ status: 'ok' })
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(mockCollection.updateOne).not.toHaveBeenCalled()
    })

    it('should increment down counter when health check fails', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'https://example.com',
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: '123' },
        { $inc: { down: 1 } }
      )
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('is unhealthy'))
    })

    it('should delete output when down count reaches threshold', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'https://example.com',
        down: 2
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger,
        hostDownRevokeScore: 3
      })

      await janitor.run()

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: '123' })
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Deleting output'))
    })

    it('should handle fetch timeout', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'https://example.com',
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      // @ts-expect-error - Mock rejected value
      ;(global.fetch as jest.Mock).mockRejectedValue(abortError)

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger,
        requestTimeoutMs: 1000
      })

      await janitor.run()

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('timeout'))
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: '123' },
        { $inc: { down: 1 } }
      )
    })

    it('should handle fetch errors', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'https://example.com',
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock rejected value
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: '123' },
        { $inc: { down: 1 } }
      )
    })

    it('should handle invalid JSON response', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'https://example.com',
        down: 0
      }

      // @ts-expect-error - Mock return value
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock toArray
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        // @ts-expect-error - Mock rejected value
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: '123' },
        { $inc: { down: 1 } }
      )
    })

    it('should verify health endpoint returns status: ok', async () => {
      const mockOutput = {
        _id: '123',
        txid: 'abc123',
        outputIndex: 0,
        domain: 'https://example.com',
        down: 1
      }

      // @ts-expect-error - Mock toArray
      mockCollection.find.mockReturnValue({
        // @ts-expect-error - Mock array result
        toArray: jest.fn().mockResolvedValue([mockOutput])
      })

      // @ts-expect-error - Mock fetch response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        // @ts-expect-error - Mock json method
        json: jest.fn().mockResolvedValue({ status: 'error' })
      })

      const janitor = new JanitorService({
        mongoDb: mockDb,
        logger: mockLogger
      })

      await janitor.run()

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: '123' },
        { $inc: { down: 1 } }
      )
    })
  })
})
