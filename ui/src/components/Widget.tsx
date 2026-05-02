import type { ReactNode } from "react";

interface WidgetProps {
    title: string;
    children: ReactNode;
    className?: string;
}

export default function Widget({ title, children, className }: WidgetProps) {
    return (
        <div className={`${className} bg-blue-900 p-5 rounded-4xl flex flex-col`}>
            <h1>{title}</h1>
            <div>
                {children}
            </div>
        </div>
    );
}