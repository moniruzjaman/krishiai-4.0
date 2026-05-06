import { createClient } from '@supabase/supabase-js';
import { User, SavedReport } from '../types';

// The Supabase URL
const supabaseUrl = process.env.SUPABASE_URL || 'https://nmngzjrrysjzuxfcklrk.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || '';

/**
 * We only initialize the client if the Key is provided.
 * This prevents the "Uncaught Error" crash during module loading.
 */
export const supabase = supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

/**
 * Synchronize user profile data with Supabase.
 */
export const syncUserProfile = async (user: User) => {
  if (!supabase || !user.uid) return null;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.uid,
        display_name: user.displayName,
        mobile: user.mobile,
        role: user.role,
        farm_location: user.farmLocation,
        progress: user.progress,
        preferred_categories: user.preferredCategories,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) console.error('Supabase Profile Sync Error:', error);
    return data;
  } catch (err) {
    console.error('Supabase Profile Sync Exception:', err);
    return null;
  }
};

/**
 * Save a diagnostic or advisory report to Supabase.
 */
export const saveReportToSupabase = async (userId: string, report: SavedReport) => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        id: report.id,
        user_id: userId,
        timestamp: new Date(report.timestamp).toISOString(),
        type: report.type,
        title: report.title,
        content: report.content,
        audio_base64: report.audioBase64,
        image_url: report.imageUrl,
        icon: report.icon,
      });

    if (error) console.error('Supabase Report Save Error:', error);
    return data;
  } catch (err) {
    console.error('Supabase Report Save Exception:', err);
    return null;
  }
};

/**
 * Fetch all reports for a specific user.
 */
export const fetchUserReports = async (userId: string) => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Supabase Fetch Error:', error);
      return [];
    }
    return data;
  } catch (err) {
    console.error('Supabase Fetch Exception:', err);
    return [];
  }
};