import neo4j, { Driver, Session, QueryResult } from 'neo4j-driver';

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

/**
 * Neo4j Service - Manages database connection and provides query helpers
 */
export class Neo4jService {
  private driver: Driver | null = null;
  private config: Neo4jConfig;
  private connected: boolean = false;

  constructor(config: Neo4jConfig) {
    this.config = config;
  }

  /**
   * Establish connection to Neo4j database
   */
  async connect(): Promise<boolean> {
    try {
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password)
      );

      // Verify connectivity
      await this.driver.verifyConnectivity();
      
      this.connected = true;
      console.error('[Neo4j] Connected successfully');
      
      // Initialize schema
      await this.initializeSchema();
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Neo4j] Connection failed: ${errorMessage}`);
      this.connected = false;
      return false;
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.driver) {
      try {
        await this.driver.close();
        this.connected = false;
        console.error('[Neo4j] Connection closed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Neo4j] Error closing connection: ${errorMessage}`);
      }
    }
  }

  /**
   * Check if Neo4j is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Execute a read query using driver.executeQuery with READ routing
   * 
   * @param cypher - Cypher query string
   * @param params - Query parameters
   * @returns Query result
   */
  async executeRead(cypher: string, params: Record<string, any> = {}): Promise<QueryResult> {
    if (!this.driver || !this.connected) {
      throw new Error('Neo4j driver not connected');
    }

    try {
      const result = await this.driver.executeQuery(cypher, params, {
        database: this.config.database || 'neo4j',
        routing: neo4j.routing.READ
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Neo4j] Read query failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Execute a write query using driver.executeQuery with WRITE routing
   * 
   * @param cypher - Cypher query string
   * @param params - Query parameters
   * @returns Query result
   */
  async executeWrite(cypher: string, params: Record<string, any> = {}): Promise<QueryResult> {
    if (!this.driver || !this.connected) {
      throw new Error('Neo4j driver not connected');
    }

    try {
      const result = await this.driver.executeQuery(cypher, params, {
        database: this.config.database || 'neo4j',
        routing: neo4j.routing.WRITE
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Neo4j] Write query failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Initialize database schema with constraints and indexes
   */
  private async initializeSchema(): Promise<void> {
    try {
      // Create constraints for uniqueness
      await this.executeWrite(
        'CREATE CONSTRAINT codebase_path_unique IF NOT EXISTS FOR (c:Codebase) REQUIRE c.path IS UNIQUE'
      );

      await this.executeWrite(
        'CREATE CONSTRAINT directory_path_unique IF NOT EXISTS FOR (d:Directory) REQUIRE d.path IS UNIQUE'
      );

      await this.executeWrite(
        'CREATE CONSTRAINT file_path_unique IF NOT EXISTS FOR (f:File) REQUIRE f.path IS UNIQUE'
      );

      await this.executeWrite(
        'CREATE CONSTRAINT dependency_name_unique IF NOT EXISTS FOR (dep:Dependency) REQUIRE dep.name IS UNIQUE'
      );

      // Create indexes for performance
      await this.executeWrite(
        'CREATE INDEX file_language_index IF NOT EXISTS FOR (f:File) ON (f.language)'
      );

      await this.executeWrite(
        'CREATE INDEX file_name_index IF NOT EXISTS FOR (f:File) ON (f.name)'
      );

      console.error('[Neo4j] Schema initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Neo4j] Schema initialization warning: ${errorMessage}`);
      // Non-fatal - continue even if schema creation has issues
    }
  }

  /**
   * Clear all data from the database
   */
  async clearDatabase(): Promise<void> {
    try {
      await this.executeWrite('MATCH (n) DETACH DELETE n');
      console.error('[Neo4j] Database cleared');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Neo4j] Failed to clear database: ${errorMessage}`);
      throw error;
    }
  }
}
