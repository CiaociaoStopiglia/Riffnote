// src/app/components/AnalyticsTracker.jsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { setTrackedUser, startTracking, trackPageView } from '../lib/analytics';

// Invisível: registra pageviews, tempo ativo, chamadas de API e erros. Ver lib/analytics.js.
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const { user, loadingUser } = useAuth();

  useEffect(() => {
    if (loadingUser) return;
    return startTracking();
  }, [loadingUser]);

  useEffect(() => {
    setTrackedUser(user);
  }, [user]);

  // Só depende do pathname: login/logout na mesma página não conta como nova visualização.
  // biome-ignore lint/correctness/useExhaustiveDependencies: user não deve disparar novo pageview
  useEffect(() => {
    if (loadingUser) return;
    trackPageView(pathname);
  }, [pathname, loadingUser]);

  return null;
}
