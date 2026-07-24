import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SignIn } from "@/features/shared/signIn";
import { SignUp } from "@/features/shared/signUp";

const translations: Record<string, string> = {
  "common.appName": "ACM Platform",
  "common.and": "and",
  "common.optional": "optional",
  "auth.shell.visualLabel": "Fresh agricultural field background",
  "auth.shell.brandKicker": "Fresh agriculture",
  "auth.shell.eyebrow": "Sustainable crop operations",
  "auth.shell.heroTitle": "Grow, sell, and manage harvests in one fresh workspace",
  "auth.shell.heroDescription": "ACM connects farm operations and marketplace workflows.",
  "auth.shell.formBadge": "Nature-first access",
  "auth.shell.languageLabel": "Choose language",
  "auth.shell.footerNote": "Protected access for every role.",
  "auth.shell.benefits.harvest.title": "Harvest ready",
  "auth.shell.benefits.harvest.description": "Move from field records to sellable products.",
  "auth.shell.benefits.traceability.title": "Traceable flow",
  "auth.shell.benefits.traceability.description": "Keep farm, season, and product context connected.",
  "auth.shell.benefits.weather.title": "Fresh insights",
  "auth.shell.benefits.weather.description": "Bring daily operations closer to weather signals.",
  "auth.signIn.title": "Sign In",
  "auth.signIn.subtitle": "Enter your email and password to sign in!",
  "auth.signIn.email": "Email",
  "auth.signIn.password": "Password",
  "auth.signIn.emailPlaceholder": "mail@acmplatform.com",
  "auth.signIn.passwordPlaceholder": "Min. 8 characters",
  "auth.signIn.keepLoggedIn": "Keep me logged in",
  "auth.signIn.forgotPassword": "Forget password?",
  "auth.signIn.signInButton": "Sign In",
  "auth.signIn.signingIn": "Signing In...",
  "auth.signIn.notRegistered": "Not registered yet?",
  "auth.signIn.createAccount": "Create an Account",
  "auth.signIn.orSignInWith": "or sign in with",
  "auth.signIn.continueWithGoogle": "Continue with Google",
  "auth.signIn.showPassword": "Show password",
  "auth.signIn.hidePassword": "Hide password",
  "auth.signIn.continueAsGuest": "Continue to marketplace as guest",
  "auth.signIn.guestMarketplaceHint": "Guests can browse products only. Create an account to place orders.",
  "auth.signUp.title": "Create Account",
  "auth.signUp.subtitle": "Enter your details to create your account",
  "auth.signUp.fullName": "Full Name",
  "auth.signUp.fullNamePlaceholder": "John Doe",
  "auth.signUp.email": "Email",
  "auth.signUp.emailPlaceholder": "john.doe@example.com",
  "auth.signUp.phoneNumber": "Phone Number",
  "auth.signUp.phoneNumberPlaceholder": "+84 123 456 789",
  "auth.signUp.password": "Password",
  "auth.signUp.passwordPlaceholder": "Abc@1234",
  "auth.signUp.confirmPassword": "Confirm Password",
  "auth.signUp.confirmPasswordPlaceholder": "Re-enter your password",
  "auth.signUp.iAmA": "I am a",
  "auth.signUp.roleFarmer": "Farmer",
  "auth.signUp.roleBuyer": "Buyer",
  "auth.signUp.roleFarmerDescription": "Manage crops and sell harvest products",
  "auth.signUp.roleBuyerDescription": "Browse and purchase farm products",
  "auth.signUp.passwordRules.title": "Password strength",
  "auth.signUp.passwordRules.minLength": "At least 8 characters",
  "auth.signUp.passwordRules.uppercase": "One uppercase letter",
  "auth.signUp.passwordRules.lowercase": "One lowercase letter",
  "auth.signUp.passwordRules.number": "One number",
  "auth.signUp.passwordRules.special": "One special character",
  "auth.signUp.termsPrefix": "I agree to the",
  "auth.signUp.termsLink": "Terms and Conditions",
  "auth.signUp.privacyLink": "Privacy Policy",
  "auth.signUp.createAccount": "Create Account",
  "auth.signUp.creatingAccount": "Creating Account...",
  "auth.signUp.hasAccount": "Already have an account?",
  "auth.signUp.signIn": "Sign In",
  "auth.signUp.orSignUpWith": "or sign up with",
  "auth.signUp.continueWithGoogle": "Continue with Google",
};

vi.mock("@/shared/lib/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => translations[key] ?? key,
    locale: "en-US",
    languageCode: "en",
    setLocale: vi.fn(),
    supportedLocales: ["en-US", "vi-VN"],
    localeDisplayNames: {},
    isLoading: false,
  }),
}));

vi.mock("@/features/shared/auth/GoogleIdentityButton", () => ({
  GoogleIdentityButton: ({
    label,
    onCredential,
    isLoading,
  }: {
    label: string;
    onCredential: (idToken: string) => void | Promise<void>;
    isLoading?: boolean;
  }) => (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => void onCredential("google-test-id-token")}
    >
      {isLoading ? "Signing in..." : label}
    </button>
  ),
}));

function renderAuth(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Authentication pages", () => {
  it("submits sign-in credentials and keeps marketplace links intact", async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn().mockResolvedValue(undefined);
    const onGoogleSignIn = vi.fn().mockResolvedValue(undefined);

    renderAuth(<SignIn onSignIn={onSignIn} onGoogleSignIn={onGoogleSignIn} />);

    await user.type(screen.getByLabelText("Email*"), "buyer@example.com");
    await user.type(screen.getByLabelText("Password*"), "password123");
    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByLabelText("Password*")).toHaveAttribute("type", "text");

    await user.click(screen.getByText("Keep me logged in"));
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(onSignIn).toHaveBeenCalledWith("buyer@example.com", "password123", true);
    });

    expect(screen.getByRole("link", { name: "Continue to marketplace as guest" }))
      .toHaveAttribute("href", "/marketplace");
    expect(screen.getByRole("link", { name: "Create an Account" }))
      .toHaveAttribute("href", "/sign-up");
  });

  it("submits a Google credential through the real auth callback path", async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn().mockResolvedValue(undefined);
    const onGoogleSignIn = vi.fn().mockResolvedValue(undefined);

    renderAuth(<SignIn onSignIn={onSignIn} onGoogleSignIn={onGoogleSignIn} />);

    await user.click(screen.getByText("Keep me logged in"));
    await user.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => {
      expect(onGoogleSignIn).toHaveBeenCalledWith("google-test-id-token", true);
    });
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("renders sign-up fields, role selection, terms, and valid submit payload", async () => {
    const user = userEvent.setup();
    const onSignUp = vi.fn().mockResolvedValue(undefined);
    const onGoogleSignIn = vi.fn().mockResolvedValue(undefined);

    renderAuth(<SignUp onSignUp={onSignUp} onGoogleSignIn={onGoogleSignIn} />);

    // Step 1
    await user.type(screen.getByLabelText("Email*"), "jane@example.com");
    await user.type(screen.getByLabelText("Password*"), "Abc@1234");
    await user.type(screen.getByLabelText("Confirm Password*"), "Abc@1234");
    await user.click(screen.getByText(/I agree to the/));
    await user.click(screen.getByText("common.continue"));

    // Wait for Step 2 to appear
    await waitFor(() => {
      expect(screen.getByText("Farmer")).toBeInTheDocument();
    });

    // Step 2
    expect(screen.getByText("Buyer")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Full Name*"), "Jane Farmer");
    await user.type(screen.getByLabelText(/Phone Number/), "+84 123 456 789");
    await user.click(screen.getByText("Buyer"));
    
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(onSignUp).toHaveBeenCalledWith({
        fullName: "Jane Farmer",
        email: "jane@example.com",
        phoneNumber: "+84 123 456 789",
        role: "BUYER",
        password: "Abc@1234",
        confirmPassword: "Abc@1234",
        termsAccepted: true,
      });
    });
  });

  it("keeps sign-up validation errors visible", async () => {
    const user = userEvent.setup();
    const onSignUp = vi.fn();
    const onGoogleSignIn = vi.fn().mockResolvedValue(undefined);

    renderAuth(<SignUp onSignUp={onSignUp} onGoogleSignIn={onGoogleSignIn} />);

    // Try to continue without filling step 1
    await user.click(screen.getByText("common.continue"));

    // Errors should appear for step 1
    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("You must accept the terms and conditions")).toBeInTheDocument();

    expect(onSignUp).not.toHaveBeenCalled();
  });
});
