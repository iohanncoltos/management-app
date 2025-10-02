"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ProfileAvatarUploader } from "./profile-avatar";

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80, "First name is too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(80, "Last name is too long"),
});

type ProfileFormValues = z.infer<typeof schema>;

interface ProfileFormProps {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

export function ProfileForm({ firstName, lastName, email, avatarUrl }: ProfileFormProps) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarUrl);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName,
      lastName,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? "Unable to update profile");
        }

        const payload = await response.json().catch(() => ({}));
        const fullName = typeof payload.name === "string" ? payload.name : `${values.firstName} ${values.lastName}`;

        toast.success("Profile updated");
        await update({
          user: {
            ...session?.user,
            name: fullName,
          },
        });
        router.refresh();
      } catch (error) {
        toast.error("Update failed", {
          description: error instanceof Error ? error.message : "Please try again shortly.",
        });
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <ProfileAvatarUploader
          name={`${firstName} ${lastName}`.trim()}
          avatarUrl={currentAvatar}
          onAvatarChange={async (next) => {
            setCurrentAvatar(next);
            await update({
              user: {
                ...session?.user,
                avatarUrl: next,
              },
            });
            router.refresh();
          }}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input placeholder="First name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input placeholder="Last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Email</label>
          <Input value={email} disabled readOnly />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
