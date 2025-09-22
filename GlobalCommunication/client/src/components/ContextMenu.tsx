import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface ContextMenuProps {
  isVisible: boolean;
  x: number;
  y: number;
  selectedText: string;
  sourceLanguage?: string;
  onClose: () => void;
}

export function ContextMenu({ isVisible, x, y, selectedText, sourceLanguage = "en-GB", onClose }: ContextMenuProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addToDictionaryMutation = useMutation({
    mutationFn: async () => {
      const targetLang = user?.preferredLanguage || "en-GB";
      
      let translatedText = selectedText;
      
      // Only translate if source and target languages are different
      if (sourceLanguage !== targetLang) {
        // First translate the text
        const translationResponse = await apiRequest("POST", "/api/translate", {
          text: selectedText,
          sourceLanguage,
          targetLanguage: targetLang,
        });
        
        if (!translationResponse.ok) {
          throw new Error("Translation API request failed");
        }
        
        const translationData = await translationResponse.json();
        if (!translationData.translatedText) {
          throw new Error("Invalid translation response");
        }
        translatedText = translationData.translatedText;
      }
      
      // Then add to dictionary
      await apiRequest("POST", "/api/dictionary", {
        originalText: selectedText,
        translatedText: translatedText,
        sourceLanguage,
        targetLanguage: targetLang,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dictionary"] });
      toast({
        title: "Added to dictionary",
        description: "Translation has been saved to your dictionary.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add to dictionary.",
        variant: "destructive",
      });
      onClose();
    },
  });

  const handleAddToDictionary = () => {
    addToDictionaryMutation.mutate();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      toast({
        title: "Copied",
        description: "Text copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy text.",
        variant: "destructive",
      });
    }
    onClose();
  };

  if (!isVisible) return null;

  return (
    <Card
      className="absolute z-50 shadow-lg border border-border"
      style={{ left: x, top: y }}
      data-testid="context-menu"
    >
      <div className="py-2">
        <Button
          variant="ghost"
          className="w-full justify-start px-4 py-2 text-sm hover:bg-secondary"
          onClick={handleAddToDictionary}
          disabled={addToDictionaryMutation.isPending}
          data-testid="button-add-to-dictionary"
        >
          <PlusCircle className="w-4 h-4 mr-2 text-accent" />
          Add to Dictionary
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start px-4 py-2 text-sm hover:bg-secondary"
          onClick={handleCopyText}
          data-testid="button-copy-text"
        >
          <Copy className="w-4 h-4 mr-2 text-muted-foreground" />
          Copy Text
        </Button>
      </div>
    </Card>
  );
}
