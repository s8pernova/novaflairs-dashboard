import type { ReactNode } from "react";

interface HUDProps {
    children?: ReactNode;
}

/**
 * Usage:
 *   <HUD>
 *     <SomeWidget />
 *     <AnotherWidget />
 *   </HUD>
 */
export default function HUD({ children }: HUDProps) {
    return (
        <div
            id="hud-root"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                pointerEvents: "none",
            }}
        >
            {children}
        </div>
    );
}
