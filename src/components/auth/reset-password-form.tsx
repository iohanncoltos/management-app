"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { resetPasswordRequestSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const requestForm = useForm<z.infer<typeof resetPasswordRequestSchema>>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: token ?? "", password: "" },
  });

  const handleRequest = requestForm.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/reset/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? "Unable to send reset link");
        }

        toast.success("Reset link sent", {
          description: "Check your Proton inbox for further instructions.",
        });
        setSubmitted(true);
      } catch (error) {
        toast.error("Request failed", {
          description: error instanceof Error ? error.message : "Contact your administrator.",
        });
      }
    });
  });

  const handleReset = resetForm.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/reset/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? "Unable to reset password");
        }

        toast.success("Access restored", {
          description: "You can now sign in with your new credentials.",
        });
        router.replace("/login");
      } catch (error) {
        toast.error("Reset failed", {
          description: error instanceof Error ? error.message : "Contact your administrator.",
        });
      }
    });
  });

  if (token) {
    return (
      <Form {...resetForm}>
        <form onSubmit={handleReset} className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="font-display text-2xl font-semibold text-foreground">Set New Access Key</h1>
            <p className="text-sm text-muted-foreground">Enter a new password to re-enable access.</p>
          </div>
          <FormField
            control={resetForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <input type="hidden" value={token} {...resetForm.register("token")} />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Updating" : "Reset password"}
          </Button>
        </form>
      </Form>
    );
  }

  return (
    <Form {...requestForm}>
      <form onSubmit={handleRequest} className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-semibold text-foreground">Reset Access</h1>
          <p className="text-sm text-muted-foreground">Provide your mission email to receive a reset link.</p>
        </div>
        <FormField
          control={requestForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@intermax.io" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Dispatching" : "Send reset link"}
        </Button>
        {submitted ? (
          <p className="text-center text-xs text-muted-foreground">If you do not receive an email, contact an administrator.</p>
        ) : null}
      </form>
    </Form>
  );
}
