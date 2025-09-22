import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Landing() {
  const [selectedLanguage, setSelectedLanguage] = useState("en-GB");
  const { toast } = useToast();

  const updateLanguageMutation = useMutation({
    mutationFn: async (preferredLanguage: string) => {
      await apiRequest("PATCH", "/api/auth/user", { preferredLanguage });
    },
    onSuccess: () => {
      toast({
        title: "Language Updated",
        description: "Your preferred language has been set successfully.",
      });
      // The useAuth hook will automatically refetch and redirect to chat
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update language preference.",
        variant: "destructive",
      });
    },
  });

  const handleGetStarted = () => {
    updateLanguageMutation.mutate(selectedLanguage);
  };

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4" data-testid="page-landing">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-title">
            Global Communication
          </h1>
          <p className="text-muted-foreground" data-testid="text-subtitle">
            Connect with people worldwide, break language barriers
          </p>
        </div>

        {/* Setup Card */}
        <Card className="shadow-lg border border-border">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Choose Your Preferred Language
                </label>
                <LanguageSelector
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                  placeholder="Select your language"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Messages in other languages will be translated to this language
                </p>
              </div>

              <Button
                onClick={handleLogin}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-4 rounded-lg font-medium transition-colors"
                data-testid="button-login"
              >
                Continue with Account
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            By continuing, you agree to connect with random users worldwide for language exchange
          </p>
        </div>
      </div>
    </div>
  );
}
