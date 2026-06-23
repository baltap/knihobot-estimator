"use client";

import React, { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    initAnalytics();
  }, []);

  return <>{children}</>;
}
