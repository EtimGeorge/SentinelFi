import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { Logger, InternalServerErrorException } from '@nestjs/common';

// Define a custom error interface for database errors that include a 'code' property
interface DbError extends Error {
  code?: string;
}

/**
 * Circuit breaker states for database connection management.
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

/**
 * Production-grade circuit breaker for database connections.
 * Prevents cascading failures by failing fast during outages.
 */
class ConnectionCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 60000; // 60 seconds
  private readonly logger = new Logger('ConnectionCircuitBreaker');

  canAttemptConnection(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.recoveryTimeout) {
        this.logger.log('Circuit breaker transitioning to HALF_OPEN for recovery test');
        this.state = CircuitState.HALF_OPEN;
        return true;
      }
      return false; // Still in open state, reject
    }

    // HALF_OPEN: Allow one test connection
    return this.state === CircuitState.HALF_OPEN;
  }

  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.log('✓ Circuit breaker recovery successful, transitioning to CLOSED');
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0; // Reset on success
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      if (this.state !== CircuitState.OPEN) {
        this.logger.error(`⚠️ Circuit breaker OPEN after ${this.failureCount} failures`);
        this.state = CircuitState.OPEN;
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.logger.warn('Recovery test failed, reopening circuit');
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Encapsulates the database configuration and provides utility classes
 * for safe and resilient database operations.
 *
 * @class DatabaseConfig
 */
export class DatabaseConfig {
  private static readonly logger = new Logger('DatabaseConfig');
  private static healthCheckInterval: NodeJS.Timeout;
  private static keepAliveInterval: NodeJS.Timeout;
  private static connectionAttempts = 0;
  private static readonly MAX_RETRY_ATTEMPTS = 5;
  private static readonly RETRY_DELAY = 5000;
  private static readonly KEEP_ALIVE_INTERVAL = 240000; // 4 minutes (before Neon's 5-min idle timeout)
  private static dataSourceRef: DataSource | null = null;
  private static circuitBreaker = new ConnectionCircuitBreaker();
  private static isReconnecting = false;

  /**
   * Returns a fully-configured TypeORM connection object, including advanced
   * connection pooling, retry strategies, and logging.
   *
   * @static
   * @param {ConfigService} configService - The NestJS ConfigService for accessing environment variables.
   * @param {any[]} entities - An array of TypeORM entities to be loaded.
   * @returns {TypeOrmModuleOptions}
   */
  static getTypeOrmConfig(configService: ConfigService, entities: any[]): TypeOrmModuleOptions {
    // This logic is preserved from the original app.module.ts to ensure consistency
    let databaseUrl = configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      this.logger.error('DATABASE_URL is not set in environment or .env files');
      throw new Error('DATABASE_URL environment variable is not set');
    }
    databaseUrl = databaseUrl.replace(/[^\x20-\x7E]/g, "").trim().replace(/^['"]|['"]$/g, "");

    const redactedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
    this.logger.log(`Using sanitized DATABASE_URL (len: ${databaseUrl.length}): ${redactedUrl}`);

    const isNeon = databaseUrl.includes("neon.tech");

    return {
      type: 'postgres',
      url: databaseUrl,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false }, // For development, allow self-signed or unverified certs if needed
      entities: entities,
      extra: {
        ssl: {
          sslmode: 'verify-full', // Explicitly set sslmode as recommended
          // rejectUnauthorized is managed by the top-level ssl config
        },
        max: 20,
        min: 5,
        idleTimeoutMillis: 300000, // 5 minutes - increased from 15s to match Neon's timeout
        connectionTimeoutMillis: 30000, // Allow 30 seconds to establish a connection
        statement_timeout: 30000,
        query_timeout: 30000,
        idle_in_transaction_session_timeout: 10000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 5000, // Send keep-alive probes more frequently
        application_name: 'sentinelfi_backend',
      },
      retryAttempts: this.MAX_RETRY_ATTEMPTS,
      retryDelay: this.RETRY_DELAY,
      synchronize: false,
      logging: configService.get('NODE_ENV') === 'development'
        ? ['error', 'warn', 'migration']
        : ['error'],
      cache: {
        type: 'database',
        duration: 60000, // 1 minute default cache
        tableName: 'query_result_cache',
      },
    };
  }

  /**
   * Validates that the database connection is alive and responsive.
   * 
   * @static
   * @param {DataSource} dataSource - The TypeORM DataSource instance.
   * @returns {Promise<boolean>} True if connection is valid, false otherwise.
   */
  static async validateConnection(dataSource: DataSource): Promise<boolean> {
    if (!this.circuitBreaker.canAttemptConnection()) {
      this.logger.warn('Circuit breaker is OPEN, rejecting connection validation');
      return false;
    }

    try {
      const result = await dataSource.query('SELECT 1 as ping');
      if (result && result[0]?.ping === 1) {
        this.circuitBreaker.recordSuccess();
        return true;
      }
      this.circuitBreaker.recordFailure();
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Connection validation failed: ${errorMessage}`);
      this.circuitBreaker.recordFailure();
      return false;
    }
  }

  /**
   * Attempts to reconnect to the database with exponential backoff.
   * 
   * @static
   * @param {DataSource} dataSource - The TypeORM DataSource instance.
   */
  private static async attemptReconnection(dataSource: DataSource): Promise<void> {
    if (this.isReconnecting) {
      this.logger.debug('Reconnection already in progress, skipping duplicate attempt');
      return;
    }

    this.isReconnecting = true;
    this.logger.warn('🔄 Attempting database reconnection...');

    try {
      // Destroy existing connections
      if (dataSource.isInitialized) {
        await dataSource.destroy();
        this.logger.log('Previous connections destroyed');
      }

      // Wait before reconnecting (exponential backoff)
      const backoffDelay = Math.min(this.RETRY_DELAY * Math.pow(2, this.connectionAttempts), 30000);
      this.logger.log(`Waiting ${backoffDelay}ms before reconnection attempt ${this.connectionAttempts + 1}/${this.MAX_RETRY_ATTEMPTS}`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));

      // Re-initialize
      await dataSource.initialize();
      this.logger.log('✓ Database reconnection successful');
      
      // Validate the new connection
      const isValid = await this.validateConnection(dataSource);
      if (isValid) {
        this.connectionAttempts = 0; // Reset on success
        this.circuitBreaker.recordSuccess();
        
        // Re-setup event handlers for the new pool
        this.setupPoolEventHandlers(dataSource);
      } else {
        throw new Error('Connection validation failed after reconnection');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.connectionAttempts++;
      this.circuitBreaker.recordFailure();
      this.logger.error(`Reconnection attempt ${this.connectionAttempts} failed: ${errorMessage}`);

      if (this.connectionAttempts < this.MAX_RETRY_ATTEMPTS) {
        // Schedule another attempt
        setTimeout(() => this.attemptReconnection(dataSource), 5000);
      } else {
        this.logger.error(`⚠️ Max reconnection attempts (${this.MAX_RETRY_ATTEMPTS}) reached. Manual intervention required.`);
      }
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Sets up event handlers for connection pool errors.
   * 
   * @static
   * @param {DataSource} dataSource - The TypeORM DataSource instance.
   */
  private static setupPoolEventHandlers(dataSource: DataSource): void {
    try {
      const pool = (dataSource.driver as any).master;
      if (!pool) {
        this.logger.warn('Connection pool not accessible, cannot setup event handlers');
        return;
      }

      // Remove existing listeners to prevent duplicates
      pool.removeAllListeners('error');

      // Handle pool-level errors (e.g., connection termination)
      pool.on('error', async (err: Error) => {
        this.logger.error(`⚠️ Postgres pool error: ${err.message}`);
        
        // Check if this is a connection termination
        if (err.message.includes('Connection terminated') || err.message.includes('ECONNRESET')) {
          this.logger.error('🔴 Connection pool died unexpectedly, initiating reconnection');
          await this.attemptReconnection(dataSource);
        }
      });

      this.logger.log('✓ Pool event handlers configured');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to setup pool event handlers: ${errorMessage}`);
    }
  }

  /**
   * Starts a keep-alive query scheduler to prevent idle connection termination.
   * Executes SELECT 1 every 4 minutes to keep Neon connections alive.
   * 
   * @static
   * @param {DataSource} dataSource - The TypeORM DataSource instance.
   */
  private static startKeepAliveScheduler(dataSource: DataSource): void {
    this.logger.log(`Starting keep-alive scheduler (interval: ${this.KEEP_ALIVE_INTERVAL / 1000}s)`);
    
    this.keepAliveInterval = setInterval(async () => {
      try {
        const startTime = Date.now();
        await dataSource.query('SELECT 1 as keepalive');
        const duration = Date.now() - startTime;
        this.logger.debug(`Keep-alive query executed successfully (${duration}ms)`);
        this.circuitBreaker.recordSuccess();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Keep-alive query failed: ${errorMessage}`);
        this.circuitBreaker.recordFailure();
        
        // Trigger reconnection if keep-alive fails
        if (errorMessage.includes('Connection terminated') || errorMessage.includes('ECONNRESET')) {
          await this.attemptReconnection(dataSource);
        }
      }
    }, this.KEEP_ALIVE_INTERVAL);
  }

  /**
   * Initializes comprehensive health monitoring and resilience mechanisms.
   *
   * @static
   * @param {DataSource} dataSource - The TypeORM DataSource instance.
   */
  static initializeHealthMonitoring(dataSource: DataSource): void {
    this.logger.log('Initializing production-grade health monitoring...');
    this.dataSourceRef = dataSource;

    // Setup pool event handlers
    this.setupPoolEventHandlers(dataSource);

    // Start keep-alive scheduler
    this.startKeepAliveScheduler(dataSource);

    // Enhanced health check with actual query execution
    this.healthCheckInterval = setInterval(async () => {
      try {
        const pool = (dataSource.driver as any).master;
        if (pool) {
          const { totalCount, idleCount, waitingCount } = pool;
          
          // Execute validation query as part of health check
          const isValid = await this.validateConnection(dataSource);
          const circuitState = this.circuitBreaker.getState();
          
          this.logger.log(`Pool Health - Total: ${totalCount}, Idle: ${idleCount}, Waiting: ${waitingCount} | Valid: ${isValid} | Circuit: ${circuitState}`);
          
          if (waitingCount > 5) {
            this.logger.warn(`⚠️ Pool Exhaustion Warning: ${waitingCount} queries waiting for connections!`);
          }
          if (idleCount === 0 && totalCount >= 15) {
            this.logger.warn('⚠️ Pool Running Hot: No idle connections!');
          }
          if (totalCount === 0) {
            this.logger.error('🔴 Pool is empty! Initiating emergency reconnection...');
            await this.attemptReconnection(dataSource);
          }
          if (!isValid && circuitState === CircuitState.CLOSED) {
            this.logger.warn('Connection validation failed, circuit breaker may be opening');
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during health check';
        this.logger.error('Health check failed:', errorMessage);
        this.circuitBreaker.recordFailure();
      }
    }, 30000); // Run every 30 seconds
  }

  /**
   * Gracefully shuts down the database connection and clears all monitoring.
   *
   * @static
   * @param {DataSource} dataSource - The TypeORM DataSource instance.
   */
  static async shutdown(dataSource: DataSource): Promise<void> {
    this.logger.log('Shutting down database connections...');
    
    // Clear all intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.logger.debug('Health check interval cleared');
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.logger.debug('Keep-alive interval cleared');
    }

    try {
      if (dataSource.isInitialized) { // Check if the DataSource is initialized before destroying
        await dataSource.destroy();
        this.logger.log('✓ Database connections closed gracefully');
      } else {
        this.logger.warn('Database DataSource was not initialized or already destroyed. Skipping destroy operation.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during database shutdown';
      this.logger.error('Error during database shutdown:', errorMessage);
    }
  }
}

/**
 * A wrapper for TypeORM transactions that provides automatic timeout and rollback.
 *
 * @export
 * @class SafeTransaction
 */
export class SafeTransaction {
  private static readonly logger = new Logger('SafeTransaction');

  /**
   * Executes a block of code within a database transaction with a timeout.
   *
   * @static
   * @template T
   * @param {DataSource} dataSource - The TypeORM DataSource.
   * @param {(manager: EntityManager) => Promise<T>} callback - The function to execute within the transaction.
   * @param {number} [timeoutMs=5000] - The timeout in milliseconds.
   * @returns {Promise<T>}
   */
  static async execute<T>(
    dataSource: DataSource,
    callback: (manager: EntityManager) => Promise<T>,
    timeoutMs: number = 5000
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Transaction timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      const result = await Promise.race([
        dataSource.transaction(callback),
        timeoutPromise
      ]);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during transaction';
      this.logger.error(`Transaction failed: ${errorMessage}`);
      throw error; // Re-throw to be handled by the calling service
    }
  }
}

/**
 * A wrapper for database queries that provides automatic retries with exponential backoff.
 *
 * @export
 * @class RetryableQuery
 */
export class RetryableQuery {
  private static readonly logger = new Logger('RetryableQuery');

  /**
   * Executes a query function with a retry mechanism.
   *
   * @static
   * @template T
   * @param {() => Promise<T>} queryFn - The async function that executes the query.
   * @param {number} [maxRetries=3] - The maximum number of retries.
   * @param {number} [baseDelay=100] - The base delay for exponential backoff.
   * @returns {Promise<T>}
   */
  static async execute<T>(
    queryFn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 100
  ): Promise<T> {
    let lastError: Error | undefined; // Initialize lastError as Error | undefined
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await queryFn();
      } catch (error) {
        // Ensure error is always treated as an Error object
        lastError = error instanceof Error ? error : new Error(String(error)); 

        // Do not retry on specific database constraint errors
        if ((lastError as DbError).code === '23505' || (lastError as DbError).code === '23503') { 
          throw lastError;
        }

        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          this.logger.warn(`Query failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms... Error: ${lastError.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    // If lastError is still unknown, re-throw as an InternalServerError
    if (lastError) { // Check if lastError was assigned
      throw lastError;
    } else {
      // This case should ideally not be reached if queryFn always throws on failure
      throw new InternalServerErrorException('An unexpected error occurred during database operation.');
    }
  }
}