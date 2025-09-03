import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff } from "lucide-react";

interface PasswordResetVerifyProps {
  email: string;
  onSuccess: () => void;
  onBackToRequest: () => void;
}

export default function PasswordResetVerify({ email, onSuccess, onBackToRequest }: PasswordResetVerifyProps) {
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const verifyMutation = useMutation({
    mutationFn: async (data: { email: string; code: string; newPassword: string }) => {
      return apiRequest("POST", "/api/auth/verify-password-reset", data);
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful!",
        description: "Your password has been updated. You can now login with your new password.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Reset failed",
        description: error?.message || "Invalid code or password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    verifyMutation.mutate({ email, code: code.trim(), newPassword });
  };

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="password-reset-verify-form">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">Reset Password</CardTitle>
        <CardDescription>
          Enter the verification code sent to {email} and your new password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              data-testid="input-reset-code"
              required
            />
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                data-testid="input-new-password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-new-password"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                data-testid="input-confirm-password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                data-testid="button-toggle-confirm-password"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={verifyMutation.isPending}
            data-testid="button-reset-password"
          >
            {verifyMutation.isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Didn't receive a code?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={onBackToRequest}
              data-testid="link-back-to-request"
            >
              Request new code
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}