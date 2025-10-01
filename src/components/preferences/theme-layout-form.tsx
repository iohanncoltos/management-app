"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { usePreferences, type LayoutDensityOption, type ThemeOption } from "@/components/providers/preferences-provider";

const themeOptions: { value: ThemeOption; title: string; description: string }[] = [
  { value: "SYSTEM", title: "System", description: "Match your operating system preference." },
  { value: "LIGHT", title: "Light", description: "High contrast light surfaces and darker text." },
  { value: "DARK", title: "Dark", description: "Low-light friendly with dark panels." },
];

const densityOptions: { value: LayoutDensityOption; title: string; description: string }[] = [
  { value: "COMFORTABLE", title: "Comfortable", description: "Roomy padding and generous spacing." },
  { value: "COMPACT", title: "Compact", description: "Tighter spacing for information-dense workflows." },
];

interface ThemeLayoutFormProps {
  initialTheme: ThemeOption;
  initialDensity: LayoutDensityOption;
}

export function ThemeLayoutForm({ initialTheme, initialDensity }: ThemeLayoutFormProps) {
  const { theme: ctxTheme, density: ctxDensity, setTheme: setCtxTheme, setDensity: setCtxDensity } = usePreferences();
  const [theme, setTheme] = useState<ThemeOption>(ctxTheme ?? initialTheme);
  const [density, setDensity] = useState<LayoutDensityOption>(ctxDensity ?? initialDensity);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTheme(ctxTheme);
  }, [ctxTheme]);

  useEffect(() => {
    setDensity(ctxDensity);
  }, [ctxDensity]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const response = await fetch("/api/preferences/theme-layout", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme, density }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? "Unable to save preferences");
        }

        setCtxTheme(theme);
        setCtxDensity(density);
        toast.success("Theme & layout updated");
      } catch (error) {
        toast.error("Save failed", {
          description: error instanceof Error ? error.message : "Please try again shortly.",
        });
      }
    });
  };

  const handleReset = () => {
    setTheme("SYSTEM");
    setDensity("COMFORTABLE");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Theme</h3>
          <p className="text-sm text-muted-foreground">Choose how Intermax appears across missions.</p>
        </div>
        <RadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemeOption)} className="grid gap-3 md:grid-cols-3">
          {themeOptions.map((option) => (
            <Label
              key={option.value}
              htmlFor={`theme-${option.value.toLowerCase()}`}
              className={`flex cursor-pointer flex-col gap-2 rounded-2xl border border-border/60 bg-secondary/50 p-4 transition hover:border-accent ${
                theme === option.value ? "border-accent shadow-glow" : ""
              }`}
            >
              <RadioGroupItem value={option.value} id={`theme-${option.value.toLowerCase()}`} className="sr-only" />
              <span className="text-sm font-semibold text-foreground">{option.title}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </Label>
          ))}
        </RadioGroup>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Layout density</h3>
          <p className="text-sm text-muted-foreground">Adjust global spacing and shell padding.</p>
        </div>
        <RadioGroup
          value={density}
          onValueChange={(value) => setDensity(value as LayoutDensityOption)}
          className="grid gap-3 md:grid-cols-2"
        >
          {densityOptions.map((option) => (
            <Label
              key={option.value}
              htmlFor={`density-${option.value.toLowerCase()}`}
              className={`flex cursor-pointer flex-col gap-2 rounded-2xl border border-border/60 bg-secondary/50 p-4 transition hover:border-accent ${
                density === option.value ? "border-accent shadow-glow" : ""
              }`}
            >
              <RadioGroupItem value={option.value} id={`density-${option.value.toLowerCase()}`} className="sr-only" />
              <span className="text-sm font-semibold text-foreground">{option.title}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </Label>
          ))}
        </RadioGroup>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving" : "Save preferences"}
        </Button>
        <Button type="button" variant="ghost" onClick={handleReset} disabled={isPending}>
          Reset to defaults
        </Button>
      </div>
    </form>
  );
}
