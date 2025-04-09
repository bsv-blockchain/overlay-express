import express from 'express'
import bodyParser from 'body-parser'
import { Engine, KnexStorage, LookupService, TopicManager, KnexStorageMigrations, Advertiser } from '@bsv/overlay'
import {
  ARC,
  ChainTracker,
  MerklePath,
  STEAK,
  TaggedBEEF,
  WhatsOnChain,
  Broadcaster,
  OverlayBroadcastFacilitator,
  HTTPSOverlayBroadcastFacilitator,
  DEFAULT_TESTNET_SLAP_TRACKERS
} from '@bsv/sdk'
import Knex from 'knex'
import { MongoClient, Db } from 'mongodb'
import makeUserInterface, { type UIConfig } from './makeUserInterface.js'
import * as DiscoveryServices from '@bsv/overlay-discovery-services'
import chalk from 'chalk'
import util from 'util'
import { v4 as uuidv4 } from 'uuid'

/**
 * Knex database migration.
 */
interface Migration {
  name?: string
  up: (knex: Knex.Knex) => Promise<void>
  down?: (knex: Knex.Knex) => Promise<void>
}

/**
 * In-memory migration source for Knex migrations.
 * Allows running migrations defined in code rather than files.
 */
class InMemoryMigrationSource implements Knex.Knex.MigrationSource<Migration> {
  constructor(private readonly migrations: Migration[]) { }

  /**
   * Gets the list of migrations.
   * @param loadExtensions - Array of file extensions to filter by (not used here)
   * @returns Promise resolving to the array of migrations
   */
  async getMigrations(loadExtensions: readonly string[]): Promise<Migration[]> {
    return this.migrations
  }

  /**
   * Gets the name of a migration.
   * @param migration - The migration object
   * @returns The name of the migration
   */
  getMigrationName(migration: Migration): string {
    return typeof migration.name === 'string' ? migration.name : `Migration at index ${this.migrations.indexOf(migration)}`
  }

  /**
   * Gets the migration object.
   * @param migration - The migration object
   * @returns Promise resolving to the migration object
   */
  async getMigration(migration: Migration): Promise<Knex.Knex.Migration> {
    return await Promise.resolve(migration)
  }
}

/**
 * Configuration options that map to Engine constructor parameters.
 */
export interface EngineConfig {
  chainTracker?: ChainTracker | 'scripts only'
  shipTrackers?: string[]
  slapTrackers?: string[]
  broadcaster?: Broadcaster
  advertiser?: Advertiser
  syncConfiguration?: Record<string, string[] | 'SHIP' | false>
  logTime?: boolean
  logPrefix?: string
  throwOnBroadcastFailure?: boolean
  overlayBroadcastFacilitator?: OverlayBroadcastFacilitator
}

/**
 * OverlayExpress class provides an Express-based server for hosting Overlay Services.
 * It allows configuration of various components like databases, topic managers, and lookup services.
 * It encapsulates an Express application and provides methods to start the server.
 */
export default class OverlayExpress {
  // Express application
  app: express.Application

  // Server port
  port: number = 3000

  // Logger (defaults to console)
  logger: typeof console = console

  // Knex (SQL) database
  knex: Knex.Knex | undefined = undefined

  // Knex migrations to run
  migrationsToRun: Array<Migration> = []

  // MongoDB database
  mongoDb: Db | undefined = undefined

  // Network ('main' or 'test')
  network: 'main' | 'test' = 'main'

  // If no custom ChainTracker is configured, default is a WhatsOnChain instance
  // (We keep a property for it, so we can pass it to Engine)
  chainTracker: ChainTracker | 'scripts only' = new WhatsOnChain(this.network)

  // The Overlay Engine
  engine: Engine | undefined = undefined

  // Configured Topic Managers
  managers: Record<string, TopicManager> = {}

  // Configured Lookup Services
  services: Record<string, LookupService> = {}

  // Enable GASP Sync
  // (We allow an on/off toggle, but also can do advanced custom sync config below)
  enableGASPSync: boolean = true

  // ARC API Key
  arcApiKey: string | undefined = undefined

  // Verbose request logging
  verboseRequestLogging: boolean = false

  // Web UI configuration
  webUIConfig: UIConfig = {}

  // Additional advanced engine config (these map to Engine constructor parameters).
  // Default to undefined or default values that are used in the Engine if not specified.
  engineConfig: EngineConfig = {}

  // The administrative Bearer token used for the admin routes.
  // If not passed in, we'll generate a random one.
  private adminToken: string

  /**
   * Constructs an instance of OverlayExpress.
   * @param name - The name of the service
   * @param privateKey - Private key used for signing advertisements
   * @param advertisableFQDN - The fully qualified domain name where this service is available. Does not include "https://".
   * @param adminToken - Optional. An administrative Bearer token used to protect admin routes.
   *                     If not provided, a random token will be generated at runtime.
   */
  constructor(
    public name: string,
    public privateKey: string,
    public advertisableFQDN: string,
    adminToken?: string
  ) {
    this.app = express()
    this.logger.log(chalk.green.bold(`${name} constructed 🎉`))
    this.adminToken = adminToken || uuidv4() // generate random if not provided
  }

  /**
   * Returns the current admin token in case you need to programmatically retrieve or display it.
   */
  getAdminToken(): string {
    return this.adminToken
  }

  /**
   * Configures the port on which the server will listen.
   * @param port - The port number
   */
  configurePort(port: number): void {
    this.port = port
    this.logger.log(chalk.blue(`🌐 Server port set to ${port}`))
  }

  /**
   * Configures the web user interface
   * @param config - Web UI configuration options
   */
  configureWebUI(config: UIConfig): void {
    this.webUIConfig = config
    this.logger.log(chalk.blue('🖥️ Web UI has been configured.'))
  }

  /**
   * Configures the logger to be used by the server.
   * @param logger - A logger object (e.g., console)
   */
  configureLogger(logger: typeof console): void {
    this.logger = logger
    this.logger.log(chalk.blue('🔍 Logger has been configured.'))
  }

  /**
   * Configures the BSV Blockchain network to be used ('main' or 'test').
   * By default, it re-initializes chainTracker as a WhatsOnChain for that network.
   * @param network - The network ('main' or 'test')
   */
  configureNetwork(network: 'main' | 'test'): void {
    this.network = network
    this.chainTracker = new WhatsOnChain(this.network)
    this.logger.log(chalk.blue(`🔗 Network set to ${network}`))
  }

  /**
   * Configures the ChainTracker to be used.
   * If 'scripts only' is used, it implies no full SPV chain tracking in the Engine.
   * @param chainTracker - An instance of ChainTracker or 'scripts only'
   */
  configureChainTracker(chainTracker: ChainTracker | 'scripts only' = new WhatsOnChain(this.network)): void {
    this.chainTracker = chainTracker
    this.logger.log(chalk.blue('🔗 ChainTracker has been configured.'))
  }

  /**
   * Configures the ARC API key.
   * @param apiKey - The ARC API key
   */
  configureArcApiKey(apiKey: string): void {
    this.arcApiKey = apiKey
    this.logger.log(chalk.blue('🔑 ARC API key has been configured.'))
  }

  /**
   * Enables or disables GASP synchronization (high-level setting).
   * This is a broad toggle that can be overridden or customized through syncConfiguration.
   * @param enable - true to enable, false to disable
   */
  configureEnableGASPSync(enable: boolean): void {
    this.enableGASPSync = enable
    this.logger.log(chalk.blue(`🔄 GASP synchronization ${enable ? 'enabled' : 'disabled'}.`))
  }

  /**
   * Enables or disables verbose request logging.
   * @param enable - true to enable, false to disable
   */
  configureVerboseRequestLogging(enable: boolean): void {
    this.verboseRequestLogging = enable
    this.logger.log(chalk.blue(`📝 Verbose request logging ${enable ? 'enabled' : 'disabled'}.`))
  }

  /**
   * Configure Knex (SQL) database connection.
   * @param config - Knex configuration object, or MySQL connection string (e.g. mysql://overlayAdmin:overlay123@mysql:3306/overlay).
   */
  async configureKnex(config: Knex.Knex.Config | string): Promise<void> {
    if (typeof config === 'string') {
      config = {
        client: 'mysql2',
        connection: config
      }
    }
    this.knex = Knex(config)
    this.logger.log(chalk.blue('📦 Knex successfully configured.'))
  }

  /**
   * Configures the MongoDB database connection.
   * @param connectionString - MongoDB connection string
   */
  async configureMongo(connectionString: string): Promise<void> {
    const mongoClient = new MongoClient(connectionString)
    await mongoClient.connect()
    const db = mongoClient.db(`${this.name}_lookup_services`)
    this.mongoDb = db
    this.logger.log(chalk.blue('🍃 MongoDB successfully configured and connected.'))
  }

  /**
   * Configures a Topic Manager.
   * @param name - The name of the Topic Manager
   * @param manager - An instance of TopicManager
   */
  configureTopicManager(name: string, manager: TopicManager): void {
    this.managers[name] = manager
    this.logger.log(chalk.blue(`🗂️ Configured topic manager ${name}`))
  }

  /**
   * Configures a Lookup Service.
   * @param name - The name of the Lookup Service
   * @param service - An instance of LookupService
   */
  configureLookupService(name: string, service: LookupService): void {
    this.services[name] = service
    this.logger.log(chalk.blue(`🔍 Configured lookup service ${name}`))
  }

  /**
   * Configures a Lookup Service using Knex (SQL) database.
   * @param name - The name of the Lookup Service
   * @param serviceFactory - A factory function that creates a LookupService instance using Knex
   */
  configureLookupServiceWithKnex(
    name: string,
    serviceFactory: (knex: Knex.Knex) => { service: LookupService; migrations: Array<Migration> }
  ): void {
    this.ensureKnex()
    const factoryResult = serviceFactory(this.knex as Knex.Knex)
    this.services[name] = factoryResult.service
    this.migrationsToRun.push(...factoryResult.migrations)
    this.logger.log(chalk.blue(`🔍 Configured lookup service ${name} with Knex`))
  }

  /**
   * Configures a Lookup Service using MongoDB.
   * @param name - The name of the Lookup Service
   * @param serviceFactory - A factory function that creates a LookupService instance using MongoDB
   */
  configureLookupServiceWithMongo(name: string, serviceFactory: (mongoDb: Db) => LookupService): void {
    this.ensureMongo()
    this.services[name] = serviceFactory(this.mongoDb as Db)
    this.logger.log(chalk.blue(`🔍 Configured lookup service ${name} with MongoDB`))
  }

  /**
   * Advanced configuration method for setting or overriding any
   * Engine constructor parameters via an EngineConfig object.
   *
   * Example usage:
   *   configureEngineParams({
   *     logTime: true,
   *     throwOnBroadcastFailure: true,
   *     overlayBroadcastFacilitator: new MyCustomFacilitator()
   *   })
   *
   * These fields will be respected when we finally build/configure the Engine
   * in the `configureEngine()` method below.
   */
  configureEngineParams(params: EngineConfig): void {
    this.engineConfig = {
      ...this.engineConfig,
      ...params
    }
    this.logger.log(chalk.blue('⚙️ Advanced Engine configuration params have been updated.'))
  }

  /**
   * Configures the Overlay Engine itself.
   * By default, auto-configures SHIP and SLAP unless autoConfigureShipSlap = false
   * Then it merges in any advanced engine config from `this.engineConfig`.
   *
   * @param autoConfigureShipSlap - Whether to auto-configure SHIP and SLAP services (default: true)
   */
  async configureEngine(autoConfigureShipSlap = true): Promise<void> {
    this.ensureKnex()

    if (autoConfigureShipSlap) {
      // Auto-configure SHIP and SLAP services
      this.configureTopicManager('tm_ship', new DiscoveryServices.SHIPTopicManager())
      this.configureTopicManager('tm_slap', new DiscoveryServices.SLAPTopicManager())
      this.configureLookupServiceWithMongo('ls_ship', (db) => new DiscoveryServices.SHIPLookupService(
        new DiscoveryServices.SHIPStorage(db)
      ))
      this.configureLookupServiceWithMongo('ls_slap', (db) => new DiscoveryServices.SLAPLookupService(
        new DiscoveryServices.SLAPStorage(db)
      ))
    }

    // Construct a default sync configuration, in case the user doesn't want GASP at all:
    let syncConfig: Record<string, string[] | 'SHIP' | false> = {}
    if (!this.enableGASPSync) {
      // For each manager, disable sync
      for (const managerName of Object.keys(this.managers)) {
        syncConfig[managerName] = false
      }
    } else {
      // If the user provided a syncConfiguration, use that. Otherwise default to an empty object.
      syncConfig = this.engineConfig.syncConfiguration || {}
    }

    // Build the actual Storage
    const storage = new KnexStorage(this.knex as Knex.Knex)
    // Include the KnexStorage migrations
    this.migrationsToRun = [...KnexStorageMigrations.default, ...this.migrationsToRun]

    // Prepare broadcaster if arcApiKey is set
    let broadcaster: Broadcaster | undefined
    if (typeof this.arcApiKey === 'string') {
      broadcaster = new ARC(
        // We hard-code some ARC URLs for now, but we should make this configurable later.
        this.network === 'test' ? 'https://arc-test.taal.com' : 'https://arc.taal.com',
        {
          apiKey: this.arcApiKey
        })
    }

    // Prepare advertiser if not set by the user
    let advertiser: Advertiser | undefined = this.engineConfig.advertiser
    if (typeof advertiser === 'undefined') {
      try {
        advertiser = new DiscoveryServices.WalletAdvertiser(
          this.network,
          this.privateKey,
          this.network === 'test' // For now, we hard-code some storage servers. In the future, this needs to be configurable.
            ? 'https://staging-storage.babbage.systems'
            : 'https://storage.babbage.systems',
          // Until multiple protocols (like https+bsvauth+smf) are fully supported, HTTPS is the one to always use.
          `https://${this.advertisableFQDN}`
        )
      } catch (e) {
        this.logger.log(`Advertiser not initialized for FQDN ${this.advertisableFQDN} - SHIP and SLAP will be disabled.`)
      }
    }

    // Construct the Engine with any advanced config overrides. Fallback to defaults.
    this.engine = new Engine(
      this.managers,
      this.services,
      storage,
      // chainTracker
      typeof this.engineConfig.chainTracker !== 'undefined'
        ? this.engineConfig.chainTracker
        : this.chainTracker,
      // hostingURL
      `https://${this.advertisableFQDN}`,
      // shipTrackers
      this.network === 'test'
        ? (this.engineConfig.shipTrackers ?? DEFAULT_TESTNET_SLAP_TRACKERS)
        : this.engineConfig.shipTrackers,
      // slapTrackers
      this.engineConfig.slapTrackers,
      // broadcaster
      broadcaster ?? this.engineConfig.broadcaster,
      // advertiser
      advertiser,
      // syncConfiguration
      syncConfig,
      // logTime
      this.engineConfig.logTime ?? false,
      // logPrefix
      this.engineConfig.logPrefix ?? '[OVERLAY_ENGINE] ',
      // throwOnBroadcastFailure
      this.engineConfig.throwOnBroadcastFailure ?? false,
      // overlayBroadcastFacilitator
      this.engineConfig.overlayBroadcastFacilitator ?? new HTTPSOverlayBroadcastFacilitator(),
      // logger
      this.logger
    )

    this.logger.log(chalk.green('🚀 Engine has been configured.'))
  }

  /**
   * Ensures that Knex is configured.
   * @throws Error if Knex is not configured
   */
  private ensureKnex(): void {
    if (typeof this.knex === 'undefined') {
      throw new Error('You must configure your SQL database with the .configureKnex() method first!')
    }
  }

  /**
   * Ensures that MongoDB is configured.
   * @throws Error if MongoDB is not configured
   */
  private ensureMongo(): void {
    if (typeof this.mongoDb === 'undefined') {
      throw new Error('You must configure your MongoDB connection with the .configureMongo() method first!')
    }
  }

  /**
   * Ensures that the Overlay Engine is configured.
   * @throws Error if the Engine is not configured
   */
  private ensureEngine(): void {
    if (typeof this.engine === 'undefined') {
      throw new Error('You must configure your Overlay Services engine with the .configureEngine() method first!')
    }
  }

  /**
   * Starts the Express server.
   * Sets up routes and begins listening on the configured port.
   */
  async start() {
    this.ensureEngine()
    this.ensureKnex()
    const engine = this.engine as Engine
    const knex = this.knex as Knex.Knex

    this.app.use(bodyParser.json({ limit: '1gb', type: 'application/json' }))
    this.app.use(bodyParser.raw({ limit: '1gb', type: 'application/octet-stream' }))

    if (this.verboseRequestLogging) {
      this.app.use((req, res, next) => {
        const startTime = Date.now()

        // Log incoming request details
        this.logger.log(chalk.magenta.bold(`📥 Incoming Request: ${req.method} ${req.originalUrl}`))
        // Pretty-print headers
        this.logger.log(chalk.cyan(`Headers:`))
        this.logger.log(util.inspect(req.headers, { colors: true, depth: null }))

        // Handle request body
        if (req.body && Object.keys(req.body).length > 0) {
          let bodyContent
          let bodyString
          if (typeof req.body === 'object') {
            bodyString = JSON.stringify(req.body, null, 2)
          } else if (Buffer.isBuffer(req.body)) {
            bodyString = req.body.toString('utf8')
          } else {
            bodyString = req.body.toString()
          }
          if (bodyString.length > 280) {
            bodyContent = chalk.yellow(`(Body too long to display, length: ${bodyString.length} characters)`)
          } else {
            bodyContent = chalk.green(`Request Body:\n${bodyString}`)
          }
          this.logger.log(bodyContent)
        }

        // Intercept the res.send method to log responses
        const originalSend = res.send
        let responseBody: any

        res.send = function (body?: any): any {
          responseBody = body
          return originalSend.call(this, body)
        }

        // Log outgoing response details after the response is finished
        res.on('finish', () => {
          const duration = Date.now() - startTime
          this.logger.log(
            chalk.magenta.bold(
              `📤 Outgoing Response: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`
            )
          )
          this.logger.log(chalk.cyan(`Response Headers:`))
          this.logger.log(util.inspect(res.getHeaders(), { colors: true, depth: null }))

          // Handle response body
          if (responseBody) {
            let bodyContent
            let bodyString
            if (typeof responseBody === 'object') {
              bodyString = JSON.stringify(responseBody, null, 2)
            } else if (Buffer.isBuffer(responseBody)) {
              bodyString = responseBody.toString('utf8')
            } else {
              bodyString = responseBody.toString()
            }
            if (bodyString.length > 280) {
              bodyContent = chalk.yellow(`(Response body too long to display, length: ${bodyString.length} characters)`)
            } else {
              bodyContent = chalk.green(`Response Body:\n${bodyString}`)
            }
            this.logger.log(bodyContent)
          }
        })

        next()
      })
    }

    // Enable CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Headers', '*')
      res.header('Access-Control-Allow-Methods', '*')
      res.header('Access-Control-Expose-Headers', '*')
      res.header('Access-Control-Allow-Private-Network', 'true')
      if (req.method === 'OPTIONS') {
        res.sendStatus(200)
      } else {
        next()
      }
    })

    // Serve a static documentation site or user interface
    this.app.get('/', (req, res) => {
      res.set('content-type', 'text/html')
      res.send(makeUserInterface(this.webUIConfig))
    })

    // List hosted topic managers and lookup services
    this.app.get('/listTopicManagers', (_, res) => {
      ; (async () => {
        try {
          const result = await engine.listTopicManagers()
          return res.status(200).json(result)
        } catch (error) {
          return res.status(400).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'An unknown error occurred'
          })
        }
      })().catch(() => {
        // This catch is for any unforeseen errors in the async IIFE itself
        res.status(500).json({
          status: 'error',
          message: 'Unexpected error'
        })
      })
    })

    this.app.get('/listLookupServiceProviders', (_, res) => {
      ; (async () => {
        try {
          const result = await engine.listLookupServiceProviders()
          return res.status(200).json(result)
        } catch (error) {
          return res.status(400).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'An unknown error occurred'
          })
        }
      })().catch(() => {
        res.status(500).json({
          status: 'error',
          message: 'Unexpected error'
        })
      })
    })

    // Host documentation for the services
    this.app.get('/getDocumentationForTopicManager', (req, res) => {
      ; (async () => {
        try {
          const manager = req.query.manager as string
          const result = await engine.getDocumentationForTopicManager(manager)
          res.setHeader('Content-Type', 'text/markdown')
          return res.status(200).send(result)
        } catch (error) {
          return res.status(400).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'An unknown error occurred'
          })
        }
      })().catch(() => {
        res.status(500).json({
          status: 'error',
          message: 'Unexpected error'
        })
      })
    })

    this.app.get('/getDocumentationForLookupServiceProvider', (req, res) => {
      ; (async () => {
        try {
          const lookupService = req.query.lookupService as string
          const result = await engine.getDocumentationForLookupServiceProvider(lookupService)
          res.setHeader('Content-Type', 'text/markdown')
          return res.status(200).send(result)
        } catch (error) {
          return res.status(400).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'An unknown error occurred'
          })
        }
      })().catch(() => {
        res.status(500).json({
          status: 'error',
          message: 'Unexpected error'
        })
      })
    })

    // Submit transactions and facilitate lookup requests
    this.app.post('/submit', (req, res) => {
      ; (async () => {
        try {
          // Parse out the topics and construct the tagged BEEF
          const topicsHeader = req.headers['x-topics']
          if (!topicsHeader) {
            throw new Error('Missing x-topics header')
          }
          const topics = JSON.parse(topicsHeader as string)
          const taggedBEEF: TaggedBEEF = {
            beef: Array.from(req.body as number[]),
            topics
          }

          // Using a callback function, we can return once the STEAK is ready
          let responseSent = false
          const steak = await engine.submit(taggedBEEF, (steak: STEAK) => {
            responseSent = true
            return res.status(200).json(steak)
          })
          if (!responseSent) {
            res.status(200).json(steak)
          }
        } catch (error) {
          console.error(chalk.red('❌ Error in /submit:'), error)
          return res.status(400).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'An unknown error occurred'
          })
        }
      })().catch(() => {
        res.status(500).json({
          status: 'error',
          message: 'Unexpected error'
        })
      })
    })

    this.app.post('/lookup', (req, res) => {
      ; (async () => {
        try {
          const result = await engine.lookup(req.body)
          return res.status(200).json(result)
        } catch (error) {
          console.error(chalk.red('❌ Error in /lookup:'), error)
          return res.status(400).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'An unknown error occurred'
          })
        }
      })().catch(() => {
        res.status(500).json({
          status: 'error',
          message: 'Unexpected error'
        })
      })
    })

    // ARC ingest route (only if we have an ARC API key)
    if (this.arcApiKey) {
      this.app.post('/arc-ingest', (req, res) => {
        ; (async () => {
          try {
            const { txid, merklePath: merklePathHex, blockHeight } = req.body
            const merklePath = MerklePath.fromHex(merklePathHex)
            await engine.handleNewMerkleProof(txid, merklePath, blockHeight)
            return res.status(200).json({ status: 'success', message: 'Transaction status updated' })
          } catch (error) {
            console.error(chalk.red('❌ Error in /arc-ingest:'), error)
            return res.status(400).json({
              status: 'error',
              message: error instanceof Error ? error.message : 'An unknown error occurred'
            })
          }
        })().catch(() => {
          res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
          })
        })
      })
    } else {
      this.logger.warn(chalk.yellow('⚠️ Disabling ARC because no ARC API key was provided.'))
    }

    // GASP sync routes if enabled
    if (this.enableGASPSync) {
      this.app.post('/requestSyncResponse', (req, res) => {
        ; (async () => {
          try {
            const topic = req.headers['x-bsv-topic'] as string
            const response = await engine.provideForeignSyncResponse(req.body, topic)
            return res.status(200).json(response)
          } catch (error) {
            console.error(chalk.red('❌ Error in /requestSyncResponse:'), error)
            return res.status(400).json({
              status: 'error',
              message: error instanceof Error ? error.message : 'An unknown error occurred'
            })
          }
        })().catch(() => {
          res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
          })
        })
      })

      this.app.post('/requestForeignGASPNode', (req, res) => {
        ; (async () => {
          try {
            const { graphID, txid, outputIndex } = req.body
            const response = await engine.provideForeignGASPNode(graphID, txid, outputIndex)
            return res.status(200).json(response)
          } catch (error) {
            console.error(chalk.red('❌ Error in /requestForeignGASPNode:'), error)
            return res.status(400).json({
              status: 'error',
              message: error instanceof Error ? error.message : 'An unknown error occurred'
            })
          }
        })().catch(() => {
          res.status(500).json({
            status: 'error',
            message: 'Unexpected error'
          })
        })
      })
    } else {
      this.logger.warn(chalk.yellow('⚠️ GASP sync is disabled.'))
    }

    /**
     * ============== ADMIN ROUTES ==============
     * These routes expose advanced engine operations
     * and require a valid Bearer token for access.
     */

    /**
     * Middleware for checking the admin bearer token.
     */
    const checkAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const authHeader = req.headers['authorization']
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized: Missing Bearer token' })
      }
      const token = authHeader.substring('Bearer '.length)
      if (token !== this.adminToken) {
        return res.status(403).json({ status: 'error', message: 'Forbidden: Invalid Bearer token' })
      }
      next()
    }

    /**
     * Admin route to manually sync advertisements, calling `engine.syncAdvertisements()`.
     */
    this.app.post('/admin/syncAdvertisements', checkAdminAuth as any, (req, res) => {
      ; (async () => {
        try {
          await engine.syncAdvertisements()
          return res.status(200).json({ status: 'success', message: 'Advertisements synced successfully' })
        } catch (error) {
          console.error(chalk.red('❌ Error in /admin/syncAdvertisements:'), error)
          return res.status(400).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'An unknown error occurred'
          })
        }
      })().catch(() => {
        res.status(500).json({
          status: 'error',
          message: 'Unexpected error'
        })
      })
    })

    /**
     * Admin route to manually start GASP sync, calling `engine.startGASPSync()`.
     */
    this.app.post('/admin/startGASPSync', checkAdminAuth as any, (req, res) => {
      ; (async () => {
        try {
          await engine.startGASPSync()
          return res.status(200).json({ status: 'success', message: 'GASP sync started and completed' })
        } catch (error) {
          console.error(chalk.red('❌ Error in /admin/startGASPSync:'), error)
          return res.status(400).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'An unknown error occurred'
          })
        }
      })().catch(() => {
        res.status(500).json({
          status: 'error',
          message: 'Unexpected error'
        })
      })
    })

    // Automatically handle migrations
    const migrationSource = new InMemoryMigrationSource(this.migrationsToRun)
    const result = await knex.migrate.latest({
      migrationSource
    })
    this.logger.log(chalk.green('🔄 Knex migrations run'), result)

    // 404 handler for all other routes
    this.app.use((req, res) => {
      this.logger.log(chalk.red('❌ 404 Not Found:'), req.url)
      res.status(404).json({
        status: 'error',
        code: 'ERR_ROUTE_NOT_FOUND',
        description: 'Route not found.'
      })
    })

    // The legacy Ninja advertiser has a setLookupEngine method.
    if (this.engine?.advertiser instanceof DiscoveryServices.WalletAdvertiser) {
      this.logger.log(
        chalk.cyan(
          `${this.name} will now advertise with SHIP and SLAP as appropriate at FQDN: ${this.advertisableFQDN}`
        )
      )
      await this.engine.advertiser.init()
    }

    // Log some info about topic managers and services
    const numTopicManagers = Object.keys(this.managers).length
    const numLookupServices = Object.keys(this.services).length
    this.logger.log(chalk.blue(`Topic Managers:  ${numTopicManagers}`))
    this.logger.log(chalk.blue(`Lookup Services: ${numLookupServices}`))

    // Attempt to sync advertisements
    try {
      await this.engine?.syncAdvertisements()
    } catch (e) {
      this.logger.log(chalk.red('❌ Error syncing advertisements:'), e)
    }

    // Attempt to do GASP sync if enabled
    if (this.enableGASPSync) {
      try {
        this.logger.log(chalk.green('Starting GASP sync...'))
        await this.engine?.startGASPSync()
        this.logger.log(chalk.green('GASP sync complete!'))
      } catch (e) {
        console.error(chalk.red('❌ Failed to GASP sync'), e)
      }
    } else {
      this.logger.log(chalk.yellow(`${this.name} will not sync because GASP has been disabled.`))
    }

    // Start listening on the configured port
    this.app.listen(this.port, async () => {
      this.logger.log(chalk.green.bold(`🎧 ${this.name} is ready and listening on local port ${this.port}`))
    })
  }
}
