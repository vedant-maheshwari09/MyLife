import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

interface RegisterFormProps {
  onSuccess: (user: any) => void;
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const { toast } = useToast();

  // Check email availability
  const { data: emailAvailability, isLoading: checkingEmail } = useQuery({
    queryKey: ['/api/auth/check-email', formData.email],
    queryFn: () => apiRequest('POST', '/api/auth/check-email', { email: formData.email.trim() }),
    enabled: formData.email.length > 0 && formData.email.includes('@') && emailBlurred,
    retry: false
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: { name: string; email: string; password: string }) => {
      return apiRequest("POST", "/api/auth/register", userData);
    },
    onSuccess: (user: any) => {
      if (user.requiresVerification) {
        toast({
          title: "Account created!",
          description: "Please check your email for a verification code.",
        });
      } else {
        toast({
          title: "Account created!",
          description: "Welcome to MyLife! Your account has been created successfully.",
        });
      }
      onSuccess(user);
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate({
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password
    });
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="register-form">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">Create Account</CardTitle>
        <CardDescription>Join MyLife to organize your life</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData("name", e.target.value)}
              placeholder="Enter your full name"
              data-testid="input-name"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData("email", e.target.value)}
                onBlur={() => setEmailBlurred(true)}
                placeholder="Enter your email"
                data-testid="input-email"
                required
                className={emailAvailability && emailBlurred ? 
                  (!emailAvailability.available ? "pr-10 border-red-300 focus:border-red-500" : "pr-10 border-green-300 focus:border-green-500")
                  : "pr-10"}
              />
              {emailBlurred && !checkingEmail && emailAvailability && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10">
                  {!emailAvailability.available ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              )}
              {checkingEmail && emailBlurred && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  <span className="text-xs">Checking...</span>
                </div>
              )}
            </div>
            {emailBlurred && emailAvailability && !emailAvailability.available && (
              <p className="text-sm text-red-600 mt-1">
                This email is already registered. Please use a different email or try logging in.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => updateFormData("password", e.target.value)}
                placeholder="Create a password (min 6 characters)"
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
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                placeholder="Confirm your password"
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
            disabled={registerMutation.isPending}
            data-testid="button-register"
          >
            {registerMutation.isPending ? "Creating account..." : "Create Account"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={onSwitchToLogin}
              data-testid="link-login"
            >
              Sign in
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}