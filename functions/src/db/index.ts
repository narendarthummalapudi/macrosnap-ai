import { drizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';
import path from 'path';

declare global {
  var _pgliteClient: PGlite | undefined;
}

export const createClient = () => {
  if (!global._pgliteClient) {
    const dbPath = path.resolve(process.cwd(), '.pglite');
    global._pgliteClient = new PGlite(dbPath);
  }
  return global._pgliteClient;
};

const client = createClient();

export const db = drizzle(client, { schema });
