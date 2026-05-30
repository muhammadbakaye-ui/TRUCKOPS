import React from 'react';
import PullToRefresh from './PullToRefresh';

/**
 * Wraps content in PullToRefresh only on mobile screens (<768px).
 * On desktop the children render directly, preserving the layout's
 * main-element scroll container and scroll-position restoration.
 */
export default function MobilePullRefresh({ onRefresh, children }) {
  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
    return <>{children}</>;
  }
  return <PullToRefresh onRefresh={onRefresh}>{children}</PullToRefresh>;
}