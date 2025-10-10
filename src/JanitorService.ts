import { Db } from 'mongodb'
import chalk from 'chalk'

/**
 * Configuration for the Janitor Service
 */
export interface JanitorConfig {
  mongoDb: Db
  logger?: typeof console
  requestTimeoutMs?: number
  hostDownRevokeScore?: number
}

/**
 * JanitorService runs a single pass of health checks on SHIP and SLAP outputs.
 * It validates domain names and checks /health endpoints to ensure services are operational.
 *
 * When a service is down, it increments a "down" counter. When healthy, it decrements.
 * If the down counter reaches HOST_DOWN_REVOKE_SCORE, it deletes the output from the database.
 *
 * This service is designed to be run periodically via external schedulers (e.g., cron, docker-compose).
 */
export class JanitorService {
  private mongoDb: Db
  private logger: typeof console
  private requestTimeoutMs: number
  private hostDownRevokeScore: number

  constructor(config: JanitorConfig) {
    this.mongoDb = config.mongoDb
    this.logger = config.logger ?? console
    this.requestTimeoutMs = config.requestTimeoutMs ?? 10000 // Default: 10 seconds
    this.hostDownRevokeScore = config.hostDownRevokeScore ?? 3
  }

  /**
   * Runs a single pass of health checks on all SHIP and SLAP outputs
   */
  async run(): Promise<void> {
    this.logger.log(chalk.blue('🧹 Running janitor health checks...'))

    try {
      // Check SHIP outputs
      await this.checkTopicOutputs('shipRecords')

      // Check SLAP outputs
      await this.checkTopicOutputs('slapRecords')

      this.logger.log(chalk.green('🧹 Janitor health checks completed'))
    } catch (error) {
      this.logger.error(chalk.red('❌ Error during health checks:'), error)
      throw error
    }
  }

  /**
   * Checks all outputs for a specific topic
   */
  private async checkTopicOutputs(collectionName: string): Promise<void> {
    try {
      const collection = this.mongoDb.collection(collectionName)
      const outputs = await collection.find({}).toArray()

      this.logger.log(chalk.cyan(`🔍 Checking ${outputs.length} ${collectionName.toUpperCase()} outputs...`))

      for (const output of outputs) {
        await this.checkOutput(output, collection)
      }
    } catch (error) {
      this.logger.error(chalk.red(`❌ Error checking ${collectionName.toUpperCase()} outputs:`), error)
    }
  }

  /**
   * Checks a single output for health
   */
  private async checkOutput(output: any, collection: any): Promise<void> {
    try {
      // Extract the URL from the output
      const url = this.extractURLFromOutput(output)
      if (url === null) {
        return // Skip if no valid URL
      }

      // Validate domain
      if (!this.isValidDomain(url)) {
        this.logger.log(chalk.yellow(`⚠️ Invalid domain for output ${output.txid}:${output.outputIndex}: ${url}`))
        await this.handleUnhealthyOutput(output, collection)
        return
      }

      // Check health endpoint
      const isHealthy = await this.checkHealthEndpoint(url)

      if (isHealthy) {
        await this.handleHealthyOutput(output, collection)
      } else {
        await this.handleUnhealthyOutput(output, collection)
      }
    } catch (error) {
      this.logger.error(chalk.red(`❌ Error checking output ${output.txid}:${output.outputIndex}:`), error)
      await this.handleUnhealthyOutput(output, collection).catch(() => {})
    }
  }

  /**
   * Extracts URL from output record
   */
  private extractURLFromOutput(output: any): string | null {
    try {
      // SHIP and SLAP outputs typically have a domain field or URL field
      // Check for common field names
      if (typeof output.domain === 'string') {
        return output.domain
      }
      if (typeof output.url === 'string') {
        return output.url
      }
      if (typeof output.serviceURL === 'string') {
        return output.serviceURL
      }
      // SLAP outputs may have a protocols array with URLs
      if (Array.isArray(output.protocols) && output.protocols.length > 0) {
        const httpsProtocol = output.protocols.find((p: any) =>
          typeof p === 'string' && p.startsWith('https://')
        )
        if (httpsProtocol !== undefined) {
          return httpsProtocol
        }
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Validates if a string is a valid domain name
   */
  private isValidDomain(url: string): boolean {
    try {
      // Parse the URL
      const parsedURL = new URL(url.startsWith('http') ? url : `https://${url}`)

      // Check if hostname is valid
      const hostname = parsedURL.hostname

      // Basic domain validation
      const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i
      const localhostRegex = /^localhost$/i
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/

      return domainRegex.test(hostname) || localhostRegex.test(hostname) || ipv4Regex.test(hostname)
    } catch {
      return false
    }
  }

  /**
   * Checks the /health endpoint of a service
   */
  private async checkHealthEndpoint(url: string): Promise<boolean> {
    try {
      // Ensure URL has protocol
      const fullURL = url.startsWith('http') ? url : `https://${url}`
      const healthURL = new URL('/health', fullURL).toString()

      // Create AbortController for timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs)

      try {
        const response = await fetch(healthURL, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        })

        clearTimeout(timeout)

        if (!response.ok) {
          return false
        }

        const data = await response.json()
        return data?.status === 'ok'
      } catch (error: any) {
        clearTimeout(timeout)
        if (error.name === 'AbortError') {
          this.logger.log(chalk.yellow(`⏱️ Health check timeout for ${healthURL}`))
        }
        return false
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Handles a healthy output by decrementing its down counter
   */
  private async handleHealthyOutput(output: any, collection: any): Promise<void> {
    try {
      const currentDown = typeof output.down === 'number' ? output.down : 0

      if (currentDown > 0) {
        // Decrement the down counter
        await collection.updateOne(
          { _id: output._id },
          { $inc: { down: -1 } }
        )
        this.logger.log(chalk.green(`✅ Output ${output.txid}:${output.outputIndex} is healthy (down: ${currentDown} -> ${currentDown - 1})`))
      }
    } catch (error) {
      this.logger.error(chalk.red(`❌ Error handling healthy output ${output.txid}:${output.outputIndex}:`), error)
    }
  }

  /**
   * Handles an unhealthy output by incrementing its down counter and deleting if threshold is reached
   */
  private async handleUnhealthyOutput(output: any, collection: any): Promise<void> {
    try {
      const currentDown = typeof output.down === 'number' ? output.down : 0
      const newDown = currentDown + 1

      this.logger.log(chalk.yellow(`⚠️ Output ${output.txid}:${output.outputIndex} is unhealthy (down: ${currentDown} -> ${newDown})`))

      // Check if we should delete the record
      if (newDown >= this.hostDownRevokeScore) {
        this.logger.log(chalk.red(`🚫 Deleting output ${output.txid}:${output.outputIndex} (down count: ${newDown} >= ${this.hostDownRevokeScore})`))
        await collection.deleteOne({ _id: output._id })
        this.logger.log(chalk.green(`✅ Successfully deleted output ${output.txid}:${output.outputIndex}`))
      } else {
        // Increment the down counter
        await collection.updateOne(
          { _id: output._id },
          { $inc: { down: 1 } }
        )
      }
    } catch (error) {
      this.logger.error(chalk.red(`❌ Error handling unhealthy output ${output.txid}:${output.outputIndex}:`), error)
    }
  }
}
