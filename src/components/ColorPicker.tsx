import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const predefinedColors = [
  { name: "שחור", value: "#1a1a1a" },
  { name: "אפור כהה", value: "#4a4a4a" },
  { name: "אפור", value: "#666666" },
  { name: "כחול כהה", value: "#1e3a8a" },
  { name: "כחול", value: "#2563eb" },
  { name: "כחול בהיר", value: "#3b82f6" },
  { name: "ירוק כהה", value: "#15803d" },
  { name: "ירוק", value: "#22c55e" },
  { name: "סגול", value: "#9333ea" },
  { name: "אדום", value: "#dc2626" },
  { name: "זהב", value: "#d97706" },
  { name: "חום", value: "#92400e" },
];

export const ColorPicker = ({ label, value, onChange }: ColorPickerProps) => {
  const handleColorClick = (color: string) => {
    onChange(color);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-6 gap-2">
        {predefinedColors.map((color) => (
          <Button
            key={color.value}
            type="button"
            variant="outline"
            className={`h-10 p-0 border-2 ${
              value === color.value ? "ring-2 ring-primary" : ""
            }`}
            style={{ backgroundColor: color.value }}
            onClick={() => handleColorClick(color.value)}
            title={color.name}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => {
            // Color input doesn't support click events with modifiers well
            onChange(e.target.value);
          }}
          className="h-10 w-20 cursor-pointer rounded border"
          title="בורר צבעים מותאם אישית"
        />
        <span className="text-sm text-muted-foreground">{value}</span>
      </div>
    </div>
  );
};
