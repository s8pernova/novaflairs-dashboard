import { render } from "@testing-library/react-native";

import { MetricCard } from "@/components/MetricCard";

describe("MetricCard", () => {
    it("renders its label, value, and supporting detail", async () => {
        const screen = await render(
            <MetricCard
                accent="#52a8e8"
                label="Wind speed"
                value="6.0 m/s"
                detail="Average across sensors"
            />,
        );

        expect(screen.getByText("Wind speed")).toBeTruthy();
        expect(screen.getByText("6.0 m/s")).toBeTruthy();
        expect(screen.getByText("Average across sensors")).toBeTruthy();
    });
});
