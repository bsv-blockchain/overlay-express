import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import OverlayExpress from '../OverlayExpress.js'
import Knex from 'knex'
import { MongoClient } from 'mongodb'
import { TopicManager, LookupService } from '@bsv/overlay'
import { ChainTracker } from '@bsv/sdk'

// Mock dependencies
jest.mock('knex')
jest.mock('mongodb')
jest.mock('@bsv/overlay')
jest.mock('@bsv/sdk')
jest.mock('@bsv/overlay-discovery-services')

describe('OverlayExpress', () => {
  let overlayExpress: OverlayExpress

  beforeEach(() => {
    jest.clearAllMocks()
    overlayExpress = new OverlayExpress(
      'TestService',
      'test-private-key-123',
      'test.example.com'
    )
  })

  describe('constructor', () => {
    it('should create instance with required parameters', () => {
      const instance = new OverlayExpress(
        'MyService',
        'private-key',
        'example.com'
      )

      expect(instance.name).toBe('MyService')
      expect(instance.privateKey).toBe('private-key')
      expect(instance.advertisableFQDN).toBe('example.com')
      expect(instance.app).toBeDefined()
    })

    it('should generate random admin token if not provided', () => {
      const instance = new OverlayExpress(
        'MyService',
        'private-key',
        'example.com'
      )

      const token = instance.getAdminToken()
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should use provided admin token', () => {
      const customToken = 'my-custom-token-123'
      const instance = new OverlayExpress(
        'MyService',
        'private-key',
        'example.com',
        customToken
      )

      expect(instance.getAdminToken()).toBe(customToken)
    })

    it('should initialize with default values', () => {
      expect(overlayExpress.port).toBe(3000)
      expect(overlayExpress.network).toBe('main')
      expect(overlayExpress.enableGASPSync).toBe(true)
      expect(overlayExpress.verboseRequestLogging).toBe(false)
      expect(overlayExpress.managers).toEqual({})
      expect(overlayExpress.services).toEqual({})
    })
  })

  describe('getAdminToken', () => {
    it('should return the admin token', () => {
      const token = overlayExpress.getAdminToken()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should return consistent token', () => {
      const token1 = overlayExpress.getAdminToken()
      const token2 = overlayExpress.getAdminToken()
      expect(token1).toBe(token2)
    })
  })

  describe('configurePort', () => {
    it('should set the port', () => {
      overlayExpress.configurePort(8080)
      expect(overlayExpress.port).toBe(8080)
    })

    it('should accept different port numbers', () => {
      overlayExpress.configurePort(3001)
      expect(overlayExpress.port).toBe(3001)

      overlayExpress.configurePort(5000)
      expect(overlayExpress.port).toBe(5000)
    })
  })

  describe('configureWebUI', () => {
    it('should set web UI config', () => {
      const config = {
        host: 'https://example.com',
        primaryColor: '#ff0000'
      }
      overlayExpress.configureWebUI(config)
      expect(overlayExpress.webUIConfig).toEqual(config)
    })

    it('should accept empty config', () => {
      overlayExpress.configureWebUI({})
      expect(overlayExpress.webUIConfig).toEqual({})
    })
  })

  describe('configureJanitor', () => {
    it('should merge janitor config', () => {
      overlayExpress.configureJanitor({
        requestTimeoutMs: 5000
      })
      expect(overlayExpress.janitorConfig.requestTimeoutMs).toBe(5000)
      expect(overlayExpress.janitorConfig.hostDownRevokeScore).toBe(3) // default
    })

    it('should update hostDownRevokeScore', () => {
      overlayExpress.configureJanitor({
        hostDownRevokeScore: 5
      })
      expect(overlayExpress.janitorConfig.hostDownRevokeScore).toBe(5)
    })

    it('should update both config values', () => {
      overlayExpress.configureJanitor({
        requestTimeoutMs: 20000,
        hostDownRevokeScore: 10
      })
      expect(overlayExpress.janitorConfig.requestTimeoutMs).toBe(20000)
      expect(overlayExpress.janitorConfig.hostDownRevokeScore).toBe(10)
    })
  })

  describe('configureLogger', () => {
    it('should set custom logger', () => {
      const customLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      } as any

      overlayExpress.configureLogger(customLogger)
      expect(overlayExpress.logger).toBe(customLogger)
    })
  })

  describe('configureNetwork', () => {
    it('should set network to main', () => {
      overlayExpress.configureNetwork('main')
      expect(overlayExpress.network).toBe('main')
    })

    it('should set network to test', () => {
      overlayExpress.configureNetwork('test')
      expect(overlayExpress.network).toBe('test')
    })

    it('should reinitialize chainTracker for network', () => {
      overlayExpress.configureNetwork('test')
      expect(overlayExpress.chainTracker).toBeDefined()
    })
  })

  describe('configureChainTracker', () => {
    it('should set custom chain tracker', () => {
      const mockChainTracker = {} as ChainTracker
      overlayExpress.configureChainTracker(mockChainTracker)
      expect(overlayExpress.chainTracker).toBe(mockChainTracker)
    })

    it('should accept "scripts only" mode', () => {
      overlayExpress.configureChainTracker('scripts only')
      expect(overlayExpress.chainTracker).toBe('scripts only')
    })
  })

  describe('configureArcApiKey', () => {
    it('should set ARC API key', () => {
      overlayExpress.configureArcApiKey('test-api-key')
      expect(overlayExpress.arcApiKey).toBe('test-api-key')
    })
  })

  describe('configureEnableGASPSync', () => {
    it('should enable GASP sync', () => {
      overlayExpress.configureEnableGASPSync(true)
      expect(overlayExpress.enableGASPSync).toBe(true)
    })

    it('should disable GASP sync', () => {
      overlayExpress.configureEnableGASPSync(false)
      expect(overlayExpress.enableGASPSync).toBe(false)
    })
  })

  describe('configureVerboseRequestLogging', () => {
    it('should enable verbose logging', () => {
      overlayExpress.configureVerboseRequestLogging(true)
      expect(overlayExpress.verboseRequestLogging).toBe(true)
    })

    it('should disable verbose logging', () => {
      overlayExpress.configureVerboseRequestLogging(false)
      expect(overlayExpress.verboseRequestLogging).toBe(false)
    })
  })

  describe('configureKnex', () => {
    it('should configure Knex with object config', async () => {
      const config = {
        client: 'mysql2',
        connection: {
          host: 'localhost',
          user: 'test',
          password: 'test',
          database: 'test'
        }
      }

      await overlayExpress.configureKnex(config)
      expect(overlayExpress.knex).toBeDefined()
    })

    it('should configure Knex with connection string', async () => {
      const connectionString = 'mysql://user:pass@localhost:3306/db'

      await overlayExpress.configureKnex(connectionString)
      expect(overlayExpress.knex).toBeDefined()
    })
  })

  describe('configureMongo', () => {
    it('should configure MongoDB connection', async () => {
      // @ts-expect-error - Mock resolved value
      const mockConnect = jest.fn().mockResolvedValue(undefined)
      const mockDb = jest.fn().mockReturnValue({})
      const mockClient = {
        connect: mockConnect,
        db: mockDb
      }

      ;(MongoClient as any).mockImplementation(() => mockClient)

      await overlayExpress.configureMongo('mongodb://localhost:27017')

      expect(mockConnect).toHaveBeenCalled()
      expect(mockDb).toHaveBeenCalledWith('TestService_lookup_services')
      expect(overlayExpress.mongoDb).toBeDefined()
    })
  })

  describe('configureTopicManager', () => {
    it('should add topic manager', () => {
      const mockManager = {} as TopicManager
      overlayExpress.configureTopicManager('test_manager', mockManager)

      expect(overlayExpress.managers['test_manager']).toBe(mockManager)
    })

    it('should add multiple topic managers', () => {
      const manager1 = {} as TopicManager
      const manager2 = {} as TopicManager

      overlayExpress.configureTopicManager('manager1', manager1)
      overlayExpress.configureTopicManager('manager2', manager2)

      expect(overlayExpress.managers['manager1']).toBe(manager1)
      expect(overlayExpress.managers['manager2']).toBe(manager2)
    })
  })

  describe('configureLookupService', () => {
    it('should add lookup service', () => {
      const mockService = {} as LookupService
      overlayExpress.configureLookupService('test_service', mockService)

      expect(overlayExpress.services['test_service']).toBe(mockService)
    })

    it('should add multiple lookup services', () => {
      const service1 = {} as LookupService
      const service2 = {} as LookupService

      overlayExpress.configureLookupService('service1', service1)
      overlayExpress.configureLookupService('service2', service2)

      expect(overlayExpress.services['service1']).toBe(service1)
      expect(overlayExpress.services['service2']).toBe(service2)
    })
  })

  describe('configureLookupServiceWithKnex', () => {
    beforeEach(async () => {
      await overlayExpress.configureKnex({
        client: 'mysql2',
        connection: {}
      })
    })

    it('should configure lookup service with Knex', () => {
      const mockService = {} as LookupService
      const mockFactory = jest.fn().mockReturnValue({
        service: mockService,
        migrations: []
      })

      // @ts-expect-error - Mock factory function
      overlayExpress.configureLookupServiceWithKnex('test_service', mockFactory)

      expect(mockFactory).toHaveBeenCalledWith(overlayExpress.knex)
      expect(overlayExpress.services['test_service']).toBe(mockService)
    })

    it('should add migrations from factory', () => {
      const mockService = {} as LookupService
      const mockMigrations = [
        { name: 'migration1', up: jest.fn() },
        { name: 'migration2', up: jest.fn() }
      ]
      const mockFactory = jest.fn().mockReturnValue({
        service: mockService,
        migrations: mockMigrations
      })

      // @ts-expect-error - Mock factory function
      overlayExpress.configureLookupServiceWithKnex('test_service', mockFactory)

      expect(overlayExpress.migrationsToRun).toContain(mockMigrations[0])
      expect(overlayExpress.migrationsToRun).toContain(mockMigrations[1])
    })

    it('should throw error if Knex not configured', () => {
      const freshInstance = new OverlayExpress('Test', 'key', 'example.com')
      const mockFactory = jest.fn()

      expect(() => {
        // @ts-expect-error - Mock factory function
        freshInstance.configureLookupServiceWithKnex('test', mockFactory)
      }).toThrow('You must configure your SQL database')
    })
  })

  describe('configureLookupServiceWithMongo', () => {
    beforeEach(async () => {
      // @ts-expect-error - Mock resolved value
      const mockConnect = jest.fn().mockResolvedValue(undefined)
      const mockDb = jest.fn().mockReturnValue({})
      const mockClient = {
        connect: mockConnect,
        db: mockDb
      }

      ;(MongoClient as any).mockImplementation(() => mockClient)

      await overlayExpress.configureMongo('mongodb://localhost:27017')
    })

    it('should configure lookup service with MongoDB', () => {
      const mockService = {} as LookupService
      const mockFactory = jest.fn().mockReturnValue(mockService)

      // @ts-expect-error - Mock factory function
      overlayExpress.configureLookupServiceWithMongo('test_service', mockFactory)

      expect(mockFactory).toHaveBeenCalledWith(overlayExpress.mongoDb)
      expect(overlayExpress.services['test_service']).toBe(mockService)
    })

    it('should throw error if MongoDB not configured', () => {
      const freshInstance = new OverlayExpress('Test', 'key', 'example.com')
      const mockFactory = jest.fn()

      expect(() => {
        // @ts-expect-error - Mock factory function
        freshInstance.configureLookupServiceWithMongo('test', mockFactory)
      }).toThrow('You must configure your MongoDB connection')
    })
  })

  describe('configureEngineParams', () => {
    it('should set engine params', () => {
      const params = {
        logTime: true,
        throwOnBroadcastFailure: true
      }

      overlayExpress.configureEngineParams(params)

      expect(overlayExpress.engineConfig.logTime).toBe(true)
      expect(overlayExpress.engineConfig.throwOnBroadcastFailure).toBe(true)
    })

    it('should merge engine params', () => {
      overlayExpress.configureEngineParams({ logTime: true })
      overlayExpress.configureEngineParams({ throwOnBroadcastFailure: false })

      expect(overlayExpress.engineConfig.logTime).toBe(true)
      expect(overlayExpress.engineConfig.throwOnBroadcastFailure).toBe(false)
    })

    it('should accept all engine config properties', () => {
      const params = {
        logTime: true,
        logPrefix: '[TEST]',
        throwOnBroadcastFailure: true,
        suppressDefaultSyncAdvertisements: false
      }

      overlayExpress.configureEngineParams(params)

      expect(overlayExpress.engineConfig).toMatchObject(params)
    })
  })

  describe('configureEngine', () => {
    beforeEach(async () => {
      await overlayExpress.configureKnex({
        client: 'mysql2',
        connection: {}
      })

      // @ts-expect-error - Mock resolved value
      const mockConnect = jest.fn().mockResolvedValue(undefined)
      const mockDb = jest.fn().mockReturnValue({})
      const mockClient = {
        connect: mockConnect,
        db: mockDb
      }

      ;(MongoClient as any).mockImplementation(() => mockClient)
      await overlayExpress.configureMongo('mongodb://localhost:27017')
    })

    it('should throw error if Knex not configured', async () => {
      const freshInstance = new OverlayExpress('Test', 'key', 'example.com')

      await expect(freshInstance.configureEngine()).rejects.toThrow(
        'You must configure your SQL database'
      )
    })

    it('should configure engine with auto SHIP/SLAP', async () => {
      await overlayExpress.configureEngine(true)

      expect(overlayExpress.engine).toBeDefined()
      expect(overlayExpress.managers['tm_ship']).toBeDefined()
      expect(overlayExpress.managers['tm_slap']).toBeDefined()
      expect(overlayExpress.services['ls_ship']).toBeDefined()
      expect(overlayExpress.services['ls_slap']).toBeDefined()
    })

    it('should configure engine without auto SHIP/SLAP', async () => {
      await overlayExpress.configureEngine(false)

      expect(overlayExpress.engine).toBeDefined()
      expect(overlayExpress.managers['tm_ship']).toBeUndefined()
      expect(overlayExpress.managers['tm_slap']).toBeUndefined()
    })

    it('should respect enableGASPSync setting', async () => {
      await overlayExpress.configureKnex({
        client: 'mysql2',
        connection: {}
      })

      // @ts-expect-error - Mock resolved value
      const mockConnect = jest.fn().mockResolvedValue(undefined)
      const mockDb = jest.fn().mockReturnValue({})
      const mockClient = {
        connect: mockConnect,
        db: mockDb
      }

      ;(MongoClient as any).mockImplementation(() => mockClient)
      await overlayExpress.configureMongo('mongodb://localhost:27017')

      overlayExpress.configureEnableGASPSync(false)
      await overlayExpress.configureEngine()

      expect(overlayExpress.engine).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should handle Knex configuration errors', async () => {
      const freshInstance = new OverlayExpress('Test', 'key', 'example.com')

      ;(Knex as any).mockImplementationOnce(() => {
        throw new Error('Knex error')
      })

      await expect(
        freshInstance.configureKnex({ client: 'mysql2' })
      ).rejects.toThrow()
    })

    it('should handle MongoDB connection errors', async () => {
      ;(MongoClient as any).mockImplementation(() => ({
        // @ts-expect-error - Mock rejected value
        connect: jest.fn().mockRejectedValue(new Error('Connection failed'))
      }))

      await expect(
        overlayExpress.configureMongo('mongodb://localhost:27017')
      ).rejects.toThrow('Connection failed')
    })
  })

  describe('integration scenarios', () => {
    it('should allow full configuration workflow', async () => {
      const instance = new OverlayExpress(
        'FullTest',
        'private-key',
        'example.com'
      )

      instance.configurePort(8080)
      instance.configureNetwork('test')
      instance.configureEnableGASPSync(true)
      instance.configureVerboseRequestLogging(false)

      await instance.configureKnex({
        client: 'mysql2',
        connection: {}
      })

      // @ts-expect-error - Mock resolved value
      const mockConnect = jest.fn().mockResolvedValue(undefined)
      const mockDb = jest.fn().mockReturnValue({})
      const mockClient = {
        connect: mockConnect,
        db: mockDb
      }

      ;(MongoClient as any).mockImplementation(() => mockClient)
      await instance.configureMongo('mongodb://localhost:27017')

      await instance.configureEngine()

      expect(instance.port).toBe(8080)
      expect(instance.network).toBe('test')
      expect(instance.enableGASPSync).toBe(true)
      expect(instance.engine).toBeDefined()
    })

    it('should handle configuration with custom admin token', () => {
      const customToken = 'secure-token-123'
      const instance = new OverlayExpress(
        'SecureService',
        'private-key',
        'example.com',
        customToken
      )

      expect(instance.getAdminToken()).toBe(customToken)
    })

    it('should maintain separate topic managers and lookup services', () => {
      const manager1 = {} as TopicManager
      const manager2 = {} as TopicManager
      const service1 = {} as LookupService
      const service2 = {} as LookupService

      overlayExpress.configureTopicManager('tm1', manager1)
      overlayExpress.configureTopicManager('tm2', manager2)
      overlayExpress.configureLookupService('ls1', service1)
      overlayExpress.configureLookupService('ls2', service2)

      expect(Object.keys(overlayExpress.managers)).toHaveLength(2)
      expect(Object.keys(overlayExpress.services)).toHaveLength(2)
    })
  })
})
