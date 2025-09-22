import { useState } from "react";
import { format } from "date-fns";
import { Check, CheckCheck, Globe, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LANGUAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: {
    type: string;
    senderId?: string;
    content?: string;
    translatedContent?: string;
    originalLanguage?: string;
    targetLanguage?: string;
    timestamp?: Date;
  };
  onTranslate: (content: string, sourceLanguage: string, targetLanguage: string) => void;
  onContextMenu: (event: React.MouseEvent, text: string, sourceLanguage: string) => void;
}

export function ChatMessage({ message, onTranslate, onContextMenu }: ChatMessageProps) {
  const { user } = useAuth();
  const [showTranslation, setShowTranslation] = useState(false);
  
  if (message.type !== 'message' || !message.content) {
    return (
      <div className="text-center" data-testid="system-message">
        <div className="inline-block bg-muted px-4 py-2 rounded-full text-sm text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  const isOwnMessage = message.senderId === user?.id;
  const sourceLanguage = message.originalLanguage || 'en-GB';
  const targetLanguage = user?.preferredLanguage || 'en-GB';
  const shouldShowTranslateButton = sourceLanguage !== targetLanguage && !isOwnMessage;

  const handleTranslate = () => {
    if (message.content && !showTranslation) {
      onTranslate(message.content, sourceLanguage, targetLanguage);
    }
    setShowTranslation(!showTranslation);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    if (!isOwnMessage && message.content) {
      onContextMenu(event, message.content, sourceLanguage);
    }
  };

  return (
    <div className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")} data-testid={`message-${message.senderId}`}>
      <div className={cn("max-w-xs lg:max-w-md", !isOwnMessage && "space-y-2")}>
        {/* Original Message */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 chat-bubble",
            isOwnMessage
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card border border-border rounded-bl-md cursor-pointer"
          )}
          onContextMenu={handleContextMenu}
          data-testid={`bubble-${isOwnMessage ? 'own' : 'other'}`}
        >
          <p className="break-words">{message.content}</p>
          <div className="flex items-center justify-between mt-2">
            <span className={cn("text-xs", isOwnMessage ? "opacity-75" : "text-muted-foreground")}>
              {message.timestamp ? format(message.timestamp, "h:mm a") : ""}
            </span>
            <div className="flex items-center space-x-1">
              {isOwnMessage ? (
                <CheckCheck className="w-3 h-3 opacity-75" />
              ) : shouldShowTranslateButton ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs p-0 h-auto text-primary hover:text-primary/80"
                  onClick={handleTranslate}
                  data-testid="button-translate"
                >
                  <Globe className="w-3 h-3 mr-1" />
                  {showTranslation ? "Hide" : "Translate"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Translation Bubble */}
        {!isOwnMessage && shouldShowTranslateButton && showTranslation && (
          <div className="bg-accent/10 border border-accent/20 rounded-2xl rounded-bl-md px-4 py-3 translation-bubble" data-testid="translation-bubble">
            <div className="flex items-start space-x-2">
              <Globe className="text-accent text-sm mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-accent-foreground break-words">
                  {message.translatedContent || "Translating..."}
                </p>
                <p className="text-xs text-accent/70 mt-1">
                  Translated from {LANGUAGES[sourceLanguage as keyof typeof LANGUAGES] || sourceLanguage}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
