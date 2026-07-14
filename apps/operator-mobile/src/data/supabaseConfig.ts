export type SupabaseConfig = {
    url: string;
    publishableKey: string;
};

export function readSupabaseConfig(
    configuredUrl: string | undefined,
    configuredPublishableKey: string | undefined,
): SupabaseConfig {
    const url = configuredUrl?.trim();
    const publishableKey = configuredPublishableKey?.trim();

    if (!url) {
        throw new Error(
            "Missing EXPO_PUBLIC_SUPABASE_URL. Copy .env.example to .env and set the project URL.",
        );
    }

    if (!publishableKey) {
        throw new Error(
            "Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and set the publishable key.",
        );
    }

    return { url, publishableKey };
}
