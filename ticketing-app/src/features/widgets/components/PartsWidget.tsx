import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Part {
  description: string;
  quantity?: string | number;
}

interface PartsWidgetProps {
  parts: Part[];
}

export function PartsWidget({ parts }: PartsWidgetProps) {
  if (!parts || parts.length === 0) {
    return (
      <Card className="p-4 bg-gray-100 h-full">
        <div className="text-muted-foreground">No parts used</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gray-100 h-full">
        <div className="flex flex-wrap gap-2">
          {parts.map((part, index) => {
            const description = typeof part === "object" && part !== null && part.description
              ? `${part.description}${part.quantity ? ` (${part.quantity})` : ""}`
              : String(part);

            return (
              <div
                key={index}
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-400/20 text-blue-400"
              >
                {description}
              </div>
            );
          })}
        </div>
    </Card>
  );
} 