import { createClient } from "@supabase/supabase-js";

const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

/**
 * Fetch records from Supabase for a specific user and table.
 * Throws explicit error if Supabase query fails.
 */
export async function fetchUserRecords(table, userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
  if (error) {
    console.error(`Supabase fetch error for table ${table}:`, error);
    throw new Error(`Failed to fetch ${table} from cloud: ${error.message}`);
  }
  return data || [];
}

/**
 * Upsert records to Supabase with explicit error handling.
 */
export async function upsertUserRecords(table, records, onConflict = "id") {
  if (!supabase || !records || records.length === 0) return true;
  const { data, error } = await supabase.from(table).upsert(records, { onConflict });
  if (error) {
    console.error(`Supabase upsert error for table ${table}:`, error);
    throw new Error(`Failed to save ${table} to cloud: ${error.message}`);
  }
  return data;
}

/**
 * Delete records matching criteria from Supabase with explicit error handling.
 */
export async function deleteUserRecords(table, matchCriteria) {
  if (!supabase || !matchCriteria) return true;
  const { error } = await supabase.from(table).delete().match(matchCriteria);
  if (error) {
    console.error(`Supabase delete error for table ${table}:`, error);
    throw new Error(`Failed to delete from ${table} in cloud: ${error.message}`);
  }
  return true;
}
