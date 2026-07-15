import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'neo4j';

let driver;

export const initNeo4j = async () => {
  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    // Verify connection
    await driver.getServerInfo();
    console.log('🔗 Neo4j connected successfully');
  } catch (error) {
    console.error('❌ Neo4j connection error:', error.message);
  }
};

export const getSession = () => {
  if (!driver) {
    throw new Error('Neo4j driver not initialized. Call initNeo4j() first.');
  }
  return driver.session();
};

export const runCypher = async (query, params = {}) => {
  const session = getSession();
  try {
    const result = await session.run(query, params);
    return result.records;
  } catch (error) {
    console.error('Cypher execution error:', error.message);
    throw error;
  } finally {
    await session.close();
  }
};

export const closeNeo4j = async () => {
  if (driver) {
    await driver.close();
  }
};
