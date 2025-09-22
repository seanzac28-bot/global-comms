import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Book, Search, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LANGUAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface DictionaryEntry {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: string;
}

interface DictionarySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DictionarySidebar({ isOpen, onClose }: DictionarySidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery<DictionaryEntry[]>({
    queryKey: ["/api/dictionary"],
    enabled: isOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/dictionary/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dictionary"] });
      toast({
        title: "Entry deleted",
        description: "Dictionary entry has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete dictionary entry.",
        variant: "destructive",
      });
    },
  });

  const filteredEntries = entries.filter(entry =>
    entry.originalText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.translatedText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div
      className={cn(
        "w-80 bg-card border-l border-border flex flex-col transition-all duration-300",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
      data-testid="dictionary-sidebar"
    >
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Book className="w-4 h-4 text-accent-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">My Dictionary</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-close-dictionary"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search dictionary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-dictionary"
            />
          </div>
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading dictionary...</div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-8" data-testid="dictionary-empty">
            <Book className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? "No entries found" : "Your dictionary is empty"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Right-click messages to add translations
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-sm transition-shadow" data-testid={`entry-${entry.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground break-words" data-testid="text-original">
                      {entry.originalText}
                    </h3>
                    <p className="text-sm text-muted-foreground" data-testid="text-source-language">
                      {LANGUAGES[entry.sourceLanguage as keyof typeof LANGUAGES] || entry.sourceLanguage}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(entry.id)}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${entry.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-foreground break-words" data-testid="text-translation">
                    {entry.translatedText}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-date">
                    Recorded: {format(new Date(entry.createdAt), "dd/MM/yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
