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
        <div className="fixed z-9999 p-3 pointer-events-none inset-0 grid grid-cols-5 grid-rows-6 grid-flow-col gap-3">
            {children}
        </div>
    );
}
