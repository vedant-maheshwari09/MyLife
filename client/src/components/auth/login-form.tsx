import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  onSuccess: (user: any) => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToRegister, onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return apiRequest("POST", "/api/auth/login", credentials);
    },
    onSuccess: (user) => {
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      onSuccess(user);
    },
    onError: (error: any) => {
      if (error?.requiresVerification) {
        // Pass verification requirement to parent
        onSuccess({ 
          ...error, 
          requiresVerification: true 
        });
      } else {
        toast({
          title: "Login failed",
          description: error?.message || "Please check your email and password.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="login-form">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">Welcome Back</CardTitle>
        <CardDescription>Sign in to your MyLife account</CardDescription>
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
              data-testid="input-email"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                data-testid="input-password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-password"
              >
                {showPassword ? (
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
            disabled={loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="mt-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={onForgotPassword}
              data-testid="link-forgot-password"
            >
              Forgot your password?
            </Button>
          </p>
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={onSwitchToRegister}
              data-testid="link-register"
            >
              Sign up
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}