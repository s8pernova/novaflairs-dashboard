import { StyleSheet, Text, View } from "react-native";

interface MetricCardProps {
    accent: string;
    label: string;
    value: string;
    detail: string;
}

export function MetricCard({ accent, label, value, detail }: MetricCardProps) {
    return (
        <View style={styles.card}>
            <View style={[styles.accent, { backgroundColor: accent }]} />
            <View style={styles.copy}>
                <Text style={styles.label}>{label}</Text>
                <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={styles.value}
                >
                    {value}
                </Text>
                <Text style={styles.detail}>{detail}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        minHeight: 86,
        flexDirection: "row",
        overflow: "hidden",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#29323a",
        backgroundColor: "#192128",
    },
    accent: {
        width: 4,
    },
    copy: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    label: {
        color: "#8f9ca6",
        fontSize: 11,
        fontWeight: "600",
    },
    value: {
        marginTop: 3,
        color: "#f4f6f8",
        fontSize: 22,
        fontWeight: "700",
    },
    detail: {
        marginTop: 2,
        color: "#687681",
        fontSize: 10,
    },
});
