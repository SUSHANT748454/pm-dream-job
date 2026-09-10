import type { Metadata } from "next";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = {
  title: "Set up your profile",
  description:
    "Tell PM Dream Job your level and current role so the board is tailored to you. Stays on your device; sign in any time to sync across devices.",
  robots: { index: false, follow: true },
};

export default function WelcomePage() {
  return <OnboardingWizard />;
}
