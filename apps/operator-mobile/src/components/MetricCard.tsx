import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";

interface MetricCardProps {
    accent: string;
    label: string;
    value: string;
    detail: string;
}

export function MetricCard({ accent, label, value, detail }: MetricCardProps) {
    return (
        <View style={[styles.card, { borderColor: accent }]}>
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
        borderRadius: radii.md,
        borderWidth: 1,
        backgroundColor: colors.surfaceRaised,
    },
    copy: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    label: {
        color: colors.riskUnknown,
        fontSize: typography.bodySmall,
        fontWeight: "600",
    },
    value: {
        marginTop: spacing.xs,
        color: colors.textPrimary,
        fontSize: typography.metric,
        fontWeight: "700",
    },
    detail: {
        marginTop: spacing.xs,
        color: colors.textSubtle,
        fontSize: typography.caption,
    },
});
