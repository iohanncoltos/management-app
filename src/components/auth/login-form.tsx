"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { loginSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const res = await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false,
          callbackUrl,
        });

        if (res?.error) {
          form.setError("password", { message: "Invalid email or password" });
          toast.error("Authentication failed", {
            description: "Check your credentials and try again.",
          });
          return;
        }

        toast.success("Welcome back", {
          description: "Secure channel restored.",
        });
        router.replace(callbackUrl);
      } catch (error) {
        console.error(error);
        toast.error("Unable to sign in", {
          description: "Please contact your administrator if the issue persists.",
        });
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-semibold text-foreground">Access Intermax Command</h1>
          <p className="text-sm text-muted-foreground">Provide your clearance credentials to proceed.</p>
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@intermax.io" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" placeholder="••••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name="remember"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                </FormControl>
                <FormLabel className="text-xs text-muted-foreground">Remember my device</FormLabel>
              </FormItem>
            )}
          />
          <Link href="/reset-password" className="text-xs font-semibold text-accent hover:text-primary">
            Reset access
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Verifying" : "Enter command"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Need an account? <Link href="/register" className="font-semibold text-accent hover:text-primary">Sign up</Link>
        </p>
      </form>
    </Form>
  );
}
