import React from 'react';
import { useTenant } from '../auth/TenantMiddleware';

export default function TenantBranding() {
  const { currentTenant } = useTenant();
  
  if (!currentTenant?.branding) return null;
  
  const branding = currentTenant.branding;
  
  return (
    <style>{`
      :root {
        --tenant-primary: ${branding.primary_color || '#14b8a6'};
        --tenant-secondary: ${branding.secondary_color || '#0f172a'};
      }
      
      .tenant-branded {
        --sidebar-primary: var(--tenant-primary);
        --sidebar-background: var(--tenant-secondary);
      }
      
      .tenant-logo {
        background-image: url('${branding.logo_url}');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }
      
      .bg-teal-600, .bg-teal-500 {
        background-color: var(--tenant-primary) !important;
      }
      
      .text-teal-400, .text-teal-500 {
        color: var(--tenant-primary) !important;
      }
      
      .border-teal-500, .border-teal-600 {
        border-color: var(--tenant-primary) !important;
      }
      
      .hover\\:bg-teal-700:hover {
        background-color: color-mix(in srgb, var(--tenant-primary) 85%, black) !important;
      }
    `}</style>
  );
}