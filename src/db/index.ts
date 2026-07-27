// Without this file my NestJS app has tables defined but no actual way to talk to my live database server

import { drizzle } from 'drizzle-orm/neon-http';
// This package allows my app to connect to Neon over fast HTTP connection
import { neon } from '@neondatabase/serverless';
// Imports all the data base tables from schema
import * as schema from './schema';

// Set up the raw connection to my NEON database
const sql = neon(process.env.DATABASE_URL!);

// Creating the db client instance by wrapping my raw database connection inside drizzle-orm and attaching my schema
// The {schema} gives Drizzle auto complete for relational queries (like : db.query.users.findMany(..))
export const db = drizzle(sql, { schema });
