
import React from 'react';

export default function AdsLayout({ children }: { children: React.ReactNode }) {
  return <div className="p-4 sm:px-6 sm:py-0 md:p-8">{children}</div>;
}
