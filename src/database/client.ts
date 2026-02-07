import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env';
import { logger } from '../utils/logger';

let supabaseClient: SupabaseClient<any> | null = null;

/**
 * Initialize database client
 */
export function getDatabaseClient(): SupabaseClient<any> {
  if (!supabaseClient) {
    if (config.supabaseUrl && config.supabaseKey) {
      supabaseClient = createClient<any>(config.supabaseUrl, config.supabaseKey);
      logger.info('Supabase client initialized');
    } else if (config.databaseUrl) {
      // For direct PostgreSQL connection, you'd use a different client
      // For now, we'll use Supabase as it provides a PostgreSQL interface
      logger.warn('Using DATABASE_URL - Supabase client may not work. Consider using SUPABASE_URL and SUPABASE_KEY');
    } else {
      throw new Error('Database configuration missing. Set SUPABASE_URL and SUPABASE_KEY or DATABASE_URL');
    }
  }
  return supabaseClient!;
}
