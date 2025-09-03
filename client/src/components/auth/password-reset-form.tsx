import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PasswordResetFormProps {
  onCodeSent: (email: string) => void;
  onBackToLogin: () => void;
}

export default function PasswordResetForm({ onCodeSent, onBackToLogin }: PasswordResetFormProps) {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const resetMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest("POST", "/api/auth/request-password-reset", { email });
    },
    onSuccess: () => {
      toast({
        title: "Reset code sent!",
        description: "Check your email for a verification code to reset your password.",
      });
      onCodeSent(email);
    },
    onError: (error: any) => {
      toast({
        title: "Reset failed",
        description: error?.message || "Failed to send reset code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    resetMutation.mutate(email.trim());
  };

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="password-reset-form">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">Reset Password</CardTitle>
        <CardDescription>Enter your email to receive a reset code</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              data-testid="input-reset-email"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={resetMutation.isPending}
            data-testid="button-send-reset-code"
          >
            {resetMutation.isPending ? "Sending..." : "Send Reset Code"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Remember your password?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={onBackToLogin}
              data-testid="link-back-to-login"
            >
              Back to Login
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}