import { createClient } from './server';

/**
 * Checks if the Supabase database connection is active by performing a lightweight query.
 * Returns true if the connection involves a successful response, false otherwise.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const supabase = await createClient();
    // Perform a lightweight query - just counting rows in a small table like 'categories'
    // 'head: true' means we only want the count, not the actual data
    const { error } = await supabase
      .from('categories')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('Supabase health check failed:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Supabase health check exception:', error);
    return false;
  }
}
