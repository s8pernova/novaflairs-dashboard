import { useEffect, useState } from "react";
import { supabase } from "./clients/supabaseClient.ts";

import "./App.css";
import FireVectorMap, {
    type FireObservation,
} from "./components/FireVectorMap.tsx";

function App() {
    const [observations, setObservations] = useState<FireObservation[]>([]);

    useEffect(() => {
        const fetchObservations = async () => {
            const response = await supabase.from("observations").select("*");
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
        </>
    );
}

export default App;
