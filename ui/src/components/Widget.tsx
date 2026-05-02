import type { ReactNode } from "react";

interface WidgetProps {
    title: string;
    children: ReactNode;
    className?: string;
}

export default function Widget({ title, children, className }: WidgetProps) {
    return (
        <div className={`${className} p-5 rounded-4xl flex flex-col`}>
            <h1 className="text-xs font-bold uppercase tracking-widest mb-3 shrink-0">
                {title}
            </h1>
            <div className="flex-1 min-h-0 overflow-hidden">
                {children}
            </div>
        </div>
    );
}