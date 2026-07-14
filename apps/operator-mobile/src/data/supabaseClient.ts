import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";

import { readSupabaseConfig } from "@/data/supabaseConfig";

const { url, publishableKey } = readSupabaseConfig(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export const supabase = createClient(url, publishableKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
});
