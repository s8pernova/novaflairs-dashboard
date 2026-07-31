import { readSupabaseConfig } from "@/data/supabaseConfig";

describe("Supabase client configuration", () => {
    it("fails clearly when the project URL is missing", () => {
        expect(() => {
            readSupabaseConfig(undefined, "sb_publishable_test");
        }).toThrow("Missing EXPO_PUBLIC_SUPABASE_URL");
    });

    it("fails clearly when the publishable key is missing", () => {
        expect(() => {
            readSupabaseConfig("https://example.supabase.co", undefined);
        }).toThrow("Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    });

    it("trims and returns valid configuration", () => {
        expect(
            readSupabaseConfig(
                " https://example.supabase.co ",
                " sb_publishable_test ",
            ),
        ).toEqual({
            url: "https://example.supabase.co",
            publishableKey: "sb_publishable_test",
        });
    });
});
