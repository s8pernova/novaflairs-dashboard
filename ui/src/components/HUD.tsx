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
        <div className="fixed z-9999 pointer-events-none inset-0">
            {children}
        </div>
    );
}
