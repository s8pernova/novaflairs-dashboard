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
    const [avgFlameLength, setAvgFlameLength] = useState<number>(0);
    const [avgBurnTime, setAvgBurnTime] = useState<number>(0);

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

    const getAverageFlameLength = () => {
        const sum = observations.reduce((acc, obs) => acc + obs.flame_length_m, 0);
        setAvgFlameLength(sum / observations.length);
    };

    const getAverageBurnTime = () => {
        const sum = observations.reduce((acc, obs) => acc + obs.burn_time_s, 0);
        setAvgBurnTime(sum / observations.length);
    };

    useEffect(() => {
        fetchObservations();
    }, []);

    useEffect(() => {
        getAverageFlameLength();
        getAverageBurnTime();
    }, [observations]);

    const widgets: Array<{
        title: string;
        component: React.ComponentType;
        props: Record<string, unknown>;
        className?: string;
    }> = [
            {
                title: "Crossing Risk",
                component: CrossingProbabilityGauge,
                props: {
                    crossingProbability: 0.62,
                    predictedCrossed: "YES",
                },
                className: "row-span-2",
            },
            {
                title: "Risk Timeline",
                component: RiskTimeline,
                props: {
                    crossingProbability: 0.62,
                    predictedCrossed: "YES",
                },
                className: "row-span-2",
            },
            {
                title: "Wind Conditions",
                component: WindConditions,
                props: {
                    windSpeed: 10,
                    windDirection: "NW",
                },
            },
            {
                title: "Flame Metrics",
                component: FlameMetrics,
                props: {
                    currentFlameLengthM: avgFlameLength,
                    currentBurnTimeS: avgBurnTime,
                },
                className: "row-span-2",
            },
        ];

    return (
        <>
            <HUD>
                {widgets.map((widget, index) => {
                    const Component = widget.component;
                    return (
                        <Widget key={index} title={widget.title} className={widget.className}>
                            <Component {...widget.props} />
                        </Widget>
                    )
                })}

                {/* Maybe add predictions on where downwords sloping winds are? */}
            </HUD>

            <main>
                <FireVectorMap observations={observations} />
            </main>
        </>
    );
}

export default App;
