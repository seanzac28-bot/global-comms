import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, type LanguageCode } from "@/lib/constants";

interface LanguageSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LanguageSelector({ value, onValueChange, placeholder = "Select language", className }: LanguageSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className} data-testid="select-language">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LANGUAGES).map(([code, name]) => (
          <SelectItem key={code} value={code} data-testid={`option-${code}`}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
