import { StatusBar } from "expo-status-bar";
import {
    initialWindowMetrics,
    SafeAreaProvider,
} from "react-native-safe-area-context";

import OperatorDashboardScreen from "@/screens/OperatorDashboardScreen";

export default function App() {
    return (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <StatusBar style="light" />
            <OperatorDashboardScreen />
        </SafeAreaProvider>
    );
}
