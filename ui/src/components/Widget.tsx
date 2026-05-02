import type { ReactNode } from "react";

interface WidgetProps {
    title: string;
    children: ReactNode;
    style?: string;
}

export default function Widget({
    title,
    children,
    style,
}: WidgetProps) {
    return (
        <div className={`${style} bg-blue-900 p-5 rounded-4xl`}>
            <h1>{title}</h1>
            {children}
        </div>
    );
}