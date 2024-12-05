import express from 'express'
import bodyParser from 'body-parser'
import { Engine, KnexStorage, LookupService, TopicManager, KnexStorageMigrations } from '@bsv/overlay'
import { ARC, ChainTracker, MerklePath, STEAK, TaggedBEEF, WhatsOnChain } from '@bsv/sdk'
import Knex from 'knex'
import { MongoClient, Db } from 'mongodb'
import makeUserInterface, { type UIConfig } from './makeUserInterface.js'
import * as DiscoveryServices from '@bsv/overlay-discovery-services'
import chalk from 'chalk'
import util from 'util'

/**
 * Knex database migration.
 */
type Migration = {
  name?: string
  up: (knex: Knex.Knex) => Promise<void>
  down?: (knex: Knex.Knex) => Promise<void>
}

/**
 * In-memory migration source for Knex migrations.
 * Allows running migrations defined in code rather than files.
 */
class InMemoryMigrationSource implements Knex.Knex.MigrationSource<Migration> {
  constructor(private migrations: Migration[]) { }

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
    return migration.name || `Migration at index ${this.migrations.indexOf(migration)}`
  }

  /**
   * Gets the migration object.
   * @param migration - The migration object
   * @returns Promise resolving to the migration object
   */
  getMigration(migration: Migration): Promise<Knex.Knex.Migration> {
    return Promise.resolve(migration)
  }
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

  // Chain tracker
  chainTracker: ChainTracker = new WhatsOnChain(this.network)

  // The Overlay Engine
  engine: Engine | undefined = undefined

  // Configured Topic Managers
  managers: Record<string, TopicManager> = {}

  // Configured Lookup Services
  services: Record<string, LookupService> = {}

  // Enable GASP Sync
  enableGASPSync: boolean = true

  // ARC API Key
  arcApiKey: string | undefined = undefined

  // Verbose request logging
  verboseRequestLogging: boolean = false

  // Web UI configuration
  webUIConfig: UIConfig = {}

  /**
   * Constructs an instance of OverlayExpress.
   * @param name - The name of the service
   * @param privateKey - Private key used for signing advertisements
   * @param hostingURL - The public URL where this service is hosted
   */
  constructor(
    public name: string,
    public privateKey: string,
    public hostingURL: string
  ) {
    this.app = express()
    this.logger.log(chalk.green.bold(`${name} constructed 🎉`))
  }

  /**
   * Configures the port on which the server will listen.
   * @param port - The port number
   */
  configurePort(port: number) {
    this.port = port
    this.logger.log(chalk.blue(`🌐 Server port set to ${port}`))
  }

  /**
   * Configures the web user interface
   * @param config - Web UI configuration options
   */
  configureWebUI(config: UIConfig) {
    this.webUIConfig = config
    this.logger.log(chalk.blue('🖥️ Web UI has been configured.'))
  }

  /**
   * Configures the logger to be used by the server.
   * @param logger - A logger object (e.g., console)
   */
  configureLogger(logger: typeof console) {
    this.logger = logger
    this.logger.log(chalk.blue('🔍 Logger has been configured.'))
  }

  /**
   * Configures the BSV Blockchain network to be used ('main' or 'test').
   * @param network - The network ('main' or 'test')
   */
  configureNetwork(network: 'main' | 'test') {
    this.network = network
    this.chainTracker = new WhatsOnChain(this.network)
    this.logger.log(chalk.blue(`🔗 Network set to ${network}`))
  }

  /**
   * Configures the ChainTracker to be used.
   * @param chainTracker - An instance of ChainTracker
   */
  configureChainTracker(chainTracker: ChainTracker = new WhatsOnChain(this.network)) {
    this.chainTracker = chainTracker
    this.logger.log(chalk.blue('🔗 ChainTracker has been configured.'))
  }

  /**
   * Configures the ARC API key.
   * @param apiKey - The ARC API key
   */
  configureArcApiKey(apiKey: string) {
    this.arcApiKey = apiKey
    this.logger.log(chalk.blue('🔑 ARC API key has been configured.'))
  }

  /**
   * Enables or disables GASP synchronization.
   * @param enable - true to enable, false to disable
   */
  configureEnableGASPSync(enable: boolean) {
    this.enableGASPSync = enable
    this.logger.log(chalk.blue(`🔄 GASP synchronization ${enable ? 'enabled' : 'disabled'}.`))
  }

  /**
   * Enables or disables verbose request logging.
   * @param enable - true to enable, false to disable
   */
  configureVerboseRequestLogging(enable: boolean) {
    this.verboseRequestLogging = enable
    this.logger.log(chalk.blue(`📝 Verbose request logging ${enable ? 'enabled' : 'disabled'}.`))
  }

  /**
   * Configures the Knex (SQL) database connection.
   * @param config - Knex configuration object, or MySQL connection string (e.g. mysql://overlayAdmin:overlay123@mysql:3306/overlay).
   */
  async configureKnex(config: Knex.Knex.Config | string) {
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
  async configureMongo(connectionString: string) {
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
  configureTopicManager(name: string, manager: TopicManager) {
    this.managers[name] = manager
    this.logger.log(chalk.blue(`🗂️ Configured topic manager ${name}`))
  }

  /**
   * Configures a Lookup Service.
   * @param name - The name of the Lookup Service
   * @param service - An instance of LookupService
   */
  configureLookupService(name: string, service: LookupService) {
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
  ) {
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
  configureLookupServiceWithMongo(name: string, serviceFactory: (mongoDb: Db) => LookupService) {
    this.ensureMongo()
    this.services[name] = serviceFactory(this.mongoDb as Db)
    this.logger.log(chalk.blue(`🔍 Configured lookup service ${name} with MongoDB`))
  }

  /**
   * Configures the Overlay Engine.
   * @param autoConfigureShipSlap - Whether to auto-configure SHIP and SLAP services (default: true)
   */
  async configureEngine(autoConfigureShipSlap = true) {
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

    // Sync configuration
    let syncConfig: Record<string, false> = {}
    if (!this.enableGASPSync) {
      for (const manager of Object.keys(this.managers)) {
        syncConfig[manager] = false
      }
    }

    const storage = new KnexStorage(this.knex as Knex.Knex)
    // Include the KnexStorage migrations
    this.migrationsToRun = [...KnexStorageMigrations.default, ...this.migrationsToRun]

    this.engine = new Engine(
      this.managers,
      this.services,
      storage,
      this.chainTracker,
      this.hostingURL,
      undefined,
      undefined,
      this.arcApiKey ? new ARC('https://arc.taal.com', {
        apiKey: this.arcApiKey
      }) : undefined,
      new DiscoveryServices.LegacyNinjaAdvertiser(this.privateKey, 'https://dojo.babbage.systems', this.hostingURL),
      syncConfig
    )
    this.logger.log(chalk.green('🚀 Engine has been configured.'))
  }

  /**
   * Ensures that Knex is configured.
   * @throws Error if Knex is not configured
   */
  private ensureKnex() {
    if (typeof this.knex === 'undefined') {
      throw new Error('You\'ll need to configure your SQL database with the .configureKnex() method first!')
    }
  }

  /**
   * Ensures that MongoDB is configured.
   * @throws Error if MongoDB is not configured
   */
  private ensureMongo() {
    if (typeof this.mongoDb === 'undefined') {
      throw new Error('You\'ll need to configure your MongoDB connection with the .configureMongo() method first!')
    }
  }

  /**
   * Ensures that the Overlay Engine is configured.
   * @throws Error if the Engine is not configured
   */
  private ensureEngine() {
    if (typeof this.engine === 'undefined') {
      throw new Error('You\'ll need to configure your Overlay Services engine with the .configureEngine() method first!')
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
        const startTime = Date.now();

        // Log incoming request details
        this.logger.log(chalk.magenta.bold(`📥 Incoming Request: ${req.method} ${req.originalUrl}`));

        // Pretty-print headers
        this.logger.log(chalk.cyan(`Headers:`));
        this.logger.log(util.inspect(req.headers, { colors: true, depth: null }));

        // Handle request body
        if (req.body && Object.keys(req.body).length > 0) {
          let bodyContent;
          let bodyString;
          if (typeof req.body === 'object') {
            bodyString = JSON.stringify(req.body, null, 2);
          } else if (Buffer.isBuffer(req.body)) {
            bodyString = req.body.toString('utf8');
          } else {
            bodyString = req.body.toString();
          }
          if (bodyString.length > 280) {
            bodyContent = chalk.yellow(`(Body too long to display, length: ${bodyString.length} characters)`);
          } else {
            bodyContent = chalk.green(`Request Body:\n${bodyString}`);
          }
          this.logger.log(bodyContent);
        }

        // Intercept the res.send method
        const originalSend = res.send;
        let responseBody: any;

        res.send = function (body?: any): any {
          responseBody = body;
          return originalSend.call(this, body);
        };

        // Log outgoing response details after the response is finished
        res.on('finish', () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            chalk.magenta.bold(
              `📤 Outgoing Response: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`
            )
          );
          this.logger.log(chalk.cyan(`Response Headers:`));
          this.logger.log(util.inspect(res.getHeaders(), { colors: true, depth: null }));

          // Handle response body
          if (responseBody) {
            let bodyContent;
            let bodyString;
            if (typeof responseBody === 'object') {
              bodyString = JSON.stringify(responseBody, null, 2);
            } else if (Buffer.isBuffer(responseBody)) {
              bodyString = responseBody.toString('utf8');
            } else {
              bodyString = responseBody.toString();
            }
            if (bodyString.length > 280) {
              bodyContent = chalk.yellow(`(Response body too long to display, length: ${bodyString.length} characters)`);
            } else {
              bodyContent = chalk.green(`Response Body:\n${bodyString}`);
            }
            this.logger.log(bodyContent);
          }
        });

        next();
      });
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
      (async () => {
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
      (async () => {
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
      (async () => {
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
      (async () => {
        try {
          const lookupService = req.query.lookupService as string
          const result = await engine.getDocumentationForLookupServiceProvider(lookupService)
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

    // Submit transactions and facilitate lookup requests
    this.app.post('/submit', (req, res) => {
      (async () => {
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

          // Using a callback function, we can just return once our steak is ready
          // instead of having to wait for all the broadcasts to occur.
          await engine.submit(taggedBEEF, (steak: STEAK) => {
            return res.status(200).json(steak)
          })
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
      (async () => {
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

    if (this.arcApiKey) {
      // Route for ARC ingest
      this.app.post('/arc-ingest', (req, res) => {
        (async () => {
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

    if (this.enableGASPSync) {
      // Routes for GASP synchronization
      this.app.post('/requestSyncResponse', (req, res) => {
        (async () => {
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
        (async () => {
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

    // Start listening on the configured port
    this.app.listen(this.port, async () => {
      this.logger.log(chalk.green.bold(`🎧 ${this.name} listening on local port ${this.port} and will now sync advertisements`));

      // The legacy Ninja advertiser has a setLookupEngine method.
      (this.engine?.advertiser as DiscoveryServices.LegacyNinjaAdvertiser).setLookupEngine(this.engine!)

      await this.engine?.syncAdvertisements()

      if (this.enableGASPSync) {
        try {
          await this.engine?.startGASPSync()
        } catch (e) {
          console.error(chalk.red('❌ Failed to GASP sync'), e)
        }
      } else {
        this.logger.log(chalk.yellow(`${this.name} will not GASP sync because it has been disabled`))
      }
    })
  }
}
