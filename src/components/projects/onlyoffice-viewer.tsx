"use client";

import { useEffect, useRef } from "react";

type DocsAPI = {
  DocEditor: new (elementId: string, config: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    DocsAPI?: DocsAPI;
  }
}

interface OnlyOfficeViewerProps {
  baseUrl: string;
  config: Record<string, unknown>;
  token: string;
}

export function OnlyOfficeViewer({ baseUrl, config, token }: OnlyOfficeViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let script = document.querySelector<HTMLScriptElement>("script[data-onlyoffice]");
    const container = containerRef.current;

    const init = () => {
      if (!window.DocsAPI || !container) return;
      new window.DocsAPI.DocEditor(container.id, {
        ...config,
        token,
      });
    };

    if (!script) {
      script = document.createElement("script");
      script.src = `${baseUrl}/web-apps/apps/api/documents/api.js`;
      script.async = true;
      script.dataset.onlyoffice = "true";
      script.onload = init;
      document.body.appendChild(script);
    } else if (window.DocsAPI) {
      init();
    }

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [baseUrl, config, token]);

  return <div id="onlyoffice-editor" ref={containerRef} className="h-[80vh] w-full rounded-3xl border border-border/60" />;
}
