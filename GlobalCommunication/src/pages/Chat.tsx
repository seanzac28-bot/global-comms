import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Globe, RotateCcw, User, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ChatMessage } from "@/components/ChatMessage";
import { DictionarySidebar } from "@/components/DictionarySidebar";
import { ContextMenu } from "@/components/ContextMenu";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState("");
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(true);
  const [userLanguage, setUserLanguage] = useState(user?.preferredLanguage || "en-GB");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    isConnected,
    messages,
    otherUser,
    isTyping,
    connectionStatus,
    sendMessage,
    translateMessage,
    sendTyping,
    startNewChat,
  } = useWebSocket();

  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  // Update language mutation
  const updateLanguageMutation = useMutation({
    mutationFn: async (preferredLanguage: string) => {
      await apiRequest("PATCH", "/api/auth/user", { preferredLanguage });
    },
    onSuccess: () => {
      toast({
        title: "Language Updated",
        description: "Your preferred language has been updated.",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && isConnected) {
      sendMessage(messageInput);
      setMessageInput("");
      sendTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    // Send typing indicator
    sendTyping(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 1000);
  };

  const handleTranslate = (content: string, sourceLanguage: string, targetLanguage: string) => {
    translateMessage(content, sourceLanguage, targetLanguage);
  };

  const handleLanguageChange = (language: string) => {
    setUserLanguage(language);
    updateLanguageMutation.mutate(language);
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'waiting':
        return 'Waiting for another user...';
      case 'connected':
        return `Connected to: ${otherUser?.name || 'Unknown User'}`;
      default:
        return 'Disconnected';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-accent';
      case 'connecting':
      case 'waiting':
        return 'text-muted-foreground';
      default:
        return 'text-destructive';
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-chat">
      {/* Top Navigation */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground" data-testid="text-app-title">
                Global Communication
              </h1>
              <p className={`text-sm font-medium ${getConnectionStatusColor()}`} data-testid="text-connection-status">
                {getConnectionStatusText()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Language Selector */}
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <LanguageSelector
                value={userLanguage}
                onValueChange={handleLanguageChange}
                className="w-32"
              />
            </div>

            {/* New Chat Button */}
            <Button
              onClick={startNewChat}
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              disabled={!isConnected}
              data-testid="button-new-chat"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Chat</span>
            </Button>

            {/* Dictionary Toggle */}
            <Button
              onClick={() => setIsDictionaryOpen(!isDictionaryOpen)}
              variant="outline"
              className="w-10 h-10 p-0"
              data-testid="button-toggle-dictionary"
            >
              <User className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isDictionaryOpen ? 'mr-80' : ''}`}>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                onTranslate={handleTranslate}
                onContextMenu={(event, text, sourceLanguage) => {
                  if (message.originalLanguage) {
                    showContextMenu(event, text, sourceLanguage);
                  }
                }}
              />
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start" data-testid="typing-indicator">
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-border p-6">
            <form onSubmit={handleSendMessage} className="flex items-end space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={connectionStatus === 'connected' ? "Type your message..." : "Waiting for connection..."}
                    value={messageInput}
                    onChange={handleInputChange}
                    className="pr-12 py-3 rounded-2xl"
                    disabled={connectionStatus !== 'connected'}
                    data-testid="input-message"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-12 h-12 rounded-2xl flex items-center justify-center transition-colors"
                disabled={!messageInput.trim() || connectionStatus !== 'connected'}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Dictionary Sidebar */}
        <div className={`absolute right-0 top-0 h-full transition-all duration-300 ${isDictionaryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <DictionarySidebar
            isOpen={isDictionaryOpen}
            onClose={() => setIsDictionaryOpen(false)}
          />
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu
        isVisible={contextMenu.isVisible}
        x={contextMenu.x}
        y={contextMenu.y}
        selectedText={contextMenu.selectedText}
        sourceLanguage={contextMenu.sourceLanguage}
        onClose={hideContextMenu}
      />
    </div>
  );
}
