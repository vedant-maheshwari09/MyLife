import { useState } from "react";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import CalendarPermission from "@/components/auth/calendar-permission";
import { EmailVerification } from "@/components/auth/email-verification";
import PasswordResetForm from "@/components/auth/password-reset-form";
import PasswordResetVerify from "@/components/auth/password-reset-verify";

type AuthStep = "login" | "register" | "verification" | "calendar" | "password-reset" | "password-reset-verify";

interface AuthPageProps {
  onAuthComplete: (user: any) => void;
}

export default function AuthPage({ onAuthComplete }: AuthPageProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>("login");
  const [user, setUser] = useState<any>(null);
  const [pendingVerificationData, setPendingVerificationData] = useState<any>(null);
  const [resetEmail, setResetEmail] = useState<string>("");

  const handleAuthSuccess = (userData: any) => {
    if (userData.requiresVerification) {
      setPendingVerificationData(userData);
      setCurrentStep("verification");
    } else {
      setUser(userData);
      // Only show calendar permission if user hasn't completed setup
      if (userData.hasCompletedCalendarSetup) {
        onAuthComplete(userData);
      } else {
        setCurrentStep("calendar");
      }
    }
  };

  const handleVerificationSuccess = (userData: any) => {
    setUser(userData);
    // Only show calendar permission if user hasn't completed setup
    if (userData.hasCompletedCalendarSetup) {
      onAuthComplete(userData);
    } else {
      setCurrentStep("calendar");
    }
  };

  const handleCalendarComplete = () => {
    onAuthComplete(user);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {currentStep === "login" && (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => setCurrentStep("register")}
            onForgotPassword={() => setCurrentStep("password-reset")}
          />
        )}
        
        {currentStep === "register" && (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setCurrentStep("login")}
          />
        )}
        
        {currentStep === "verification" && pendingVerificationData && (
          <EmailVerification
            userId={pendingVerificationData.id}
            email={pendingVerificationData.email}
            onVerificationSuccess={handleVerificationSuccess}
          />
        )}
        
        {currentStep === "calendar" && user && (
          <CalendarPermission
            onComplete={handleCalendarComplete}
            userName={user.name || user.username || ""}
          />
        )}
        
        {currentStep === "password-reset" && (
          <PasswordResetForm
            onCodeSent={(email) => {
              setResetEmail(email);
              setCurrentStep("password-reset-verify");
            }}
            onBackToLogin={() => setCurrentStep("login")}
          />
        )}
        
        {currentStep === "password-reset-verify" && (
          <PasswordResetVerify
            email={resetEmail}
            onSuccess={() => setCurrentStep("login")}
            onBackToRequest={() => setCurrentStep("password-reset")}
          />
        )}
      </div>
    </div>
  );
}