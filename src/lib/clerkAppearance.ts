import { dark } from "@clerk/themes";

const clerkDarkVariables = {
    colorPrimary: "#10b981",
    colorPrimaryForeground: "#ffffff",
    colorBackground: "#171717",
    colorText: "#fafafa",
    colorForeground: "#fafafa",
    colorTextSecondary: "#d4d4d4",
    colorMuted: "#262626",
    colorMutedForeground: "#a3a3a3",
    colorInputBackground: "#262626",
    colorInputText: "#fafafa",
    colorNeutral: "#525252",
    colorDanger: "#f87171",
    colorBorder: "#404040",
    borderRadius: "0.75rem",
} as const;

/** Clerk sign-in / sign-up only. */
export const clerkAuthAppearance = {
    baseTheme: dark,
    variables: clerkDarkVariables,
    elements: {
        rootBox: "mx-auto w-full max-w-[420px] flex justify-center",
        cardBox: "w-full flex justify-center",
        card: "w-full bg-neutral-900 border border-neutral-700 shadow-2xl shadow-black/50",
        headerTitle: "text-white font-bold",
        headerSubtitle: "text-neutral-300",
        socialButtonsBlockButton:
            "bg-neutral-800 border border-neutral-600 text-white hover:bg-neutral-700",
        socialButtonsBlockButtonText: "text-white font-medium",
        dividerLine: "bg-neutral-600",
        dividerText: "text-neutral-300",
        formFieldLabel: "text-neutral-100 font-medium",
        formFieldInput:
            "bg-neutral-800 border-neutral-600 text-white placeholder:text-neutral-400",
        formFieldInputShowPasswordButton: "text-neutral-300",
        footerActionText: "text-neutral-300",
        footerActionLink: "text-emerald-400 hover:text-emerald-300",
        identityPreviewText: "text-white",
        identityPreviewEditButton: "text-emerald-400",
        formButtonPrimary:
            "bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md",
        alertText: "text-neutral-100",
        formFieldSuccessText: "text-emerald-400",
        formFieldErrorText: "text-red-400",
        otpCodeFieldInput: "bg-neutral-800 border-neutral-600 text-white",
        footer: "hidden",
        footerAction: "hidden",
    },
} as const;

/** Global Clerk — dark tokens for UserButton / modals; auth pages override locally. */
export const clerkProviderAppearance = {
    baseTheme: dark,
    variables: clerkDarkVariables,
    elements: {
        footer: "hidden",
        footerAction: "hidden",
        userButtonPopoverFooter: "hidden",
        userButtonPopoverCard: "!bg-neutral-900 !border !border-neutral-700 !shadow-xl",
        userButtonPopoverActions: "!border-neutral-800",
        userButtonPopoverActionButton: "!text-neutral-100 hover:!bg-neutral-800",
        userButtonPopoverActionButtonText: "!text-neutral-100",
        userButtonPopoverActionButtonIcon: "!text-neutral-400",
        userPreviewMainIdentifier: "!text-white !font-semibold",
        userPreviewSecondaryIdentifier: "!text-neutral-400",
        userButtonPopoverMain: "!bg-neutral-900",
    },
} as const;

/** Profile menu in the navbar (explicit overrides on UserButton). */
export const clerkUserButtonAppearance = {
    baseTheme: dark,
    variables: clerkDarkVariables,
    elements: {
        ...clerkProviderAppearance.elements,
        userButtonPopoverFooter: "hidden",
    },
} as const;
