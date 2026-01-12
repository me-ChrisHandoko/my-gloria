"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Eye, EyeOff, KeyRound } from "lucide-react";
import { useChangePasswordMutation } from "@/lib/store/services/authApi";
import { toast } from "sonner";

export default function ChangePasswordPage() {
    const router = useRouter();
    const [changePassword, { isLoading }] = useChangePasswordMutation();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Password validation checks
    const passwordChecks = {
        minLength: newPassword.length >= 8,
        maxLength: newPassword.length <= 100,
        hasNumber: /\d/.test(newPassword),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
        passwordsMatch: newPassword === confirmPassword && confirmPassword.length > 0,
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate current password
        if (!currentPassword) {
            toast.error("Current password is required");
            return;
        }

        // Validate new password
        if (!passwordChecks.minLength || !passwordChecks.maxLength) {
            toast.error("New password must be between 8 and 100 characters");
            return;
        }

        // Validate password match
        if (!passwordChecks.passwordsMatch) {
            toast.error("New passwords do not match");
            return;
        }

        // Check if new password is same as current
        if (currentPassword === newPassword) {
            toast.error("New password must be different from current password");
            return;
        }

        try {
            const result = await changePassword({
                current_password: currentPassword,
                new_password: newPassword,
            }).unwrap();

            toast.success(result.message || "Password changed successfully!");

            // Redirect after 2 seconds
            setTimeout(() => {
                router.push("/dashboard");
            }, 2000);
        } catch (err: any) {
            const errorMessage = err?.data?.error || err?.message || "Failed to change password";
            toast.error(errorMessage);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
            <div className="w-full max-w-md space-y-6 px-4">
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <KeyRound className="size-6" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold">Change Password</h2>
                    <p className="text-sm text-muted-foreground">Enter your current password and choose a new one</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <div className="space-y-2">
                        <label htmlFor="currentPassword" className="text-sm font-medium">
                            Current Password
                        </label>
                        <div className="relative">
                            <Input id="currentPassword" type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" required disabled={isLoading} className="pr-10" />
                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="newPassword" className="text-sm font-medium">
                            New Password
                        </label>
                        <div className="relative">
                            <Input id="newPassword" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required minLength={8} maxLength={100} disabled={isLoading} className="pr-10" />
                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        {newPassword.length > 0 && (
                            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Password Requirements:</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs">
                                        {passwordChecks.minLength ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <X className="h-4 w-4 text-muted-foreground" />}
                                        <span className={passwordChecks.minLength ? "text-foreground" : "text-muted-foreground"}>At least 8 characters</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        {passwordChecks.maxLength ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <X className="h-4 w-4 text-muted-foreground" />}
                                        <span className={passwordChecks.maxLength ? "text-foreground" : "text-muted-foreground"}>Maximum 100 characters</span>
                                    </div>
                                    <div className="border-t pt-2 mt-2">
                                        <p className="text-xs text-muted-foreground mb-1.5">Recommended for stronger security:</p>
                                        <div className="flex items-center gap-2 text-xs">
                                            {passwordChecks.hasNumber ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <X className="h-4 w-4 text-muted-foreground" />}
                                            <span className={passwordChecks.hasNumber ? "text-foreground" : "text-muted-foreground"}>Contains a number</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            {passwordChecks.hasSpecialChar ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <X className="h-4 w-4 text-muted-foreground" />}
                                            <span className={passwordChecks.hasSpecialChar ? "text-foreground" : "text-muted-foreground"}>Contains a special character (!@#$%^&*)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="text-sm font-medium">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={8} maxLength={100} disabled={isLoading} className="pr-10" />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {confirmPassword.length > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                                {passwordChecks.passwordsMatch ? (
                                    <>
                                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span className="text-green-600 dark:text-green-400">Passwords match</span>
                                    </>
                                ) : (
                                    <>
                                        <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                                        <span className="text-red-600 dark:text-red-400">Passwords do not match</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !currentPassword || !passwordChecks.minLength || !passwordChecks.maxLength || !passwordChecks.passwordsMatch} className="flex-1">
                            {isLoading ? "Changing Password..." : "Change Password"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
