import SupabaseService from './SupabaseService';
import { SUPABASE_CONFIG } from './config';

const supabaseService = new SupabaseService(SUPABASE_CONFIG);

export default supabaseService; 