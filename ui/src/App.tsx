import { useEffect, useState } from "react";
import { supabase } from "./clients/supabaseClient.ts";

import "./App.css";
import FireVectorMap, {
    type FireObservation,
} from "./components/FireVectorMap.tsx";
import HUD from "./components/HUD.tsx";
import Widget from "./components/Widget.tsx";

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
            <main>
                <FireVectorMap observations={observations} />
            </main>
            <HUD>
                <Widget title="Widget 1">Content 1</Widget>
                <Widget title="Widget 2">Content 2</Widget>
            </HUD>
        </>
    );
}

export default App;
