import type { ReactNode } from "react";

interface WidgetProps {
    title: string;
    children: ReactNode;
    /** Extra Tailwind classes forwarded to the outer grid-cell wrapper (e.g. row-span-2) */
    className?: string;
    /** When true, the content area is a perfect square */
    square?: boolean;
}

export default function Widget({
    title,
    children,
    className = "",
    square = false,
}: WidgetProps) {
    return (
        // self-start (when square) opts out of grid-cell height-stretching so
        // aspect-square can freely set height = width on the content area below
        <div className={`${className} ${square ? "self-start" : ""} bg-blue-900 p-5 rounded-4xl flex flex-col`}>
            <h1>{title}</h1>
            <div className={square ? "aspect-square w-full overflow-hidden" : "flex-1 min-h-0"}>
                {children}
            </div>
        </div>
    );
}