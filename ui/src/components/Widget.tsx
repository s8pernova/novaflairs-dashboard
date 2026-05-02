import type { ReactNode } from "react";

interface WidgetProps {
    title: string;
    children: ReactNode;
}

export default function Widget({ title, children }: WidgetProps) {
    return (
        <div className="bg-blue-900 p-2 rounded">
            <h1>{title}</h1>
            {children}
        </div>
    );
}