import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mail, RefreshCw } from "lucide-react";

const verificationSchema = z.object({
  code: z.string().min(6, "Verification code must be 6 digits").max(6, "Verification code must be 6 digits"),
});

type VerificationForm = z.infer<typeof verificationSchema>;

interface EmailVerificationProps {
  userId: string;
  email: string;
  onVerificationSuccess: (user: any) => void;
}

export function EmailVerification({ userId, email, onVerificationSuccess }: EmailVerificationProps) {
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: VerificationForm) => {
      const response = await apiRequest("POST", "/api/auth/verify-email", {
        userId,
        code: data.code,
      });
      return response;
    },
    onSuccess: (user) => {
      toast({
        title: "Email verified successfully!",
        description: "You can now access your account.",
      });
      onVerificationSuccess(user);
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error?.message || "Invalid or expired verification code",
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/resend-verification", { userId });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Verification code sent!",
        description: "Check the console logs for your verification code (development mode).",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resend code",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VerificationForm) => {
    verifyMutation.mutate(data);
  };

  const handleResendCode = async () => {
    setIsResending(true);
    resendMutation.mutate();
    setTimeout(() => setIsResending(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-800">
            <Mail className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We sent a 6-digit verification code to{" "}
            <span className="font-medium text-orange-600 dark:text-orange-400">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="input-verification-code"
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="text-center text-2xl tracking-widest"
                        onChange={(e) => {
                          // Only allow numbers
                          const value = e.target.value.replace(/\D/g, "");
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={verifyMutation.isPending}
                data-testid="button-verify-email"
              >
                {verifyMutation.isPending ? "Verifying..." : "Verify Email"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Didn't receive the code?
            </p>
            <Button
              variant="ghost"
              onClick={handleResendCode}
              disabled={isResending || resendMutation.isPending}
              className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
              data-testid="button-resend-code"
            >
              {isResending || resendMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend code"
              )}
            </Button>
          </div>

          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-xs text-orange-700 dark:text-orange-300">
              <strong>Development Mode:</strong> Check the server console logs to see the verification code.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}