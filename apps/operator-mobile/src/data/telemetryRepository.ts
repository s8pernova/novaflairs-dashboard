import { mockObservations } from "@/data/mockObservations";
import type { TelemetryObservation } from "@/domain/telemetry";

export async function getTelemetryObservations(): Promise<
    TelemetryObservation[]
> {
    // TODO: Replace this mock boundary with a Supabase query in learning step 3.
    await new Promise((resolve) => setTimeout(resolve, 350));
    return mockObservations;
}
