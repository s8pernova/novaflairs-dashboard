import { useEffect, useState } from "react";
import { supabase } from "./clients/supabaseClient.ts";

import "./App.css";
import FireVectorMap, {
    type FireObservation,
} from "./components/FireVectorMap.tsx";
import HUD from "./components/HUD.tsx";
import Widget from "./components/Widget.tsx";
import CrossingProbabilityGauge from "./components/CrossingProbabilityGauge.tsx";
import RiskTimeline from "./components/RiskTimeline.tsx";
import WindConditions from "./components/WindConditions.tsx";
import FlameMetrics from "./components/FlameMetrics.tsx";

function App() {
    const [observations, setObservations] = useState<FireObservation[]>([]);

    useEffect(() => {
        const fetchObservations = async () => {
            const response = await supabase
                .from("telemetry_observations")
                .select("*")
                .limit(10);
            if (response.error) {
                console.error("Error fetching observations:", response.error);
                return;
            }
            const data = response.data as FireObservation[];
            setObservations(data);
        };

        fetchObservations();
    }, []);

    return (
        <>
            <HUD>
                <Widget title="Crossing Risk" className="row-span-2">
                    <CrossingProbabilityGauge
                        crossingProbability={0.62}
                        predictedCrossed="YES"
                    />
                </Widget>
                <Widget title="Risk Timeline" className="col-span-2 row-span-2">
                    <RiskTimeline />
                </Widget>
                <Widget title="Wind Conditions">
                    <WindConditions />
                </Widget>
                <Widget title="Flame Metrics" className="row-span-2">
                    <FlameMetrics />
                </Widget>
            </HUD>

            <main>
                <FireVectorMap observations={observations} />
            </main>
        </>
    );
}

export default App;
