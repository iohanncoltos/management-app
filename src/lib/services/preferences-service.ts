import { LayoutDensityPreference, ThemePreference } from "@prisma/client";

import { prisma } from "@/lib/db";

export const DEFAULT_THEME = ThemePreference.DARK;
export const DEFAULT_DENSITY = LayoutDensityPreference.COMFORTABLE;

export type UserPreferenceSettings = {
  theme: ThemePreference;
  density: LayoutDensityPreference;
};

export async function getUserPreferences(userId: string | null | undefined): Promise<UserPreferenceSettings> {
  if (!userId) {
    return { theme: DEFAULT_THEME, density: DEFAULT_DENSITY };
  }

  const record = await prisma.userPreference.findUnique({ where: { userId } });
  if (!record) {
    return { theme: DEFAULT_THEME, density: DEFAULT_DENSITY };
  }

  return {
    theme: record.theme,
    density: record.density,
  };
}

export async function upsertUserPreferences(userId: string, settings: UserPreferenceSettings): Promise<UserPreferenceSettings> {
  const updated = await prisma.userPreference.upsert({
    where: { userId },
    update: settings,
    create: {
      userId,
      ...settings,
    },
  });

  return {
    theme: updated.theme,
    density: updated.density,
  };
}
