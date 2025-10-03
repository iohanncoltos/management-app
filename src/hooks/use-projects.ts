"use client";

import { useQuery } from "@tanstack/react-query";

interface Project {
  id: string;
  code: string;
  name: string;
  status: string;
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });
}
