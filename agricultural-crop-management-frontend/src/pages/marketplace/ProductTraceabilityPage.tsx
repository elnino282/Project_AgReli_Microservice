import { Navigate, useParams } from 'react-router-dom';

/**
 * Legacy marketplace trace route.
 *
 * PublicTracePage is the single source of truth for traceability claims. Keeping
 * this redirect preserves old product links without maintaining a second,
 * presentation-only trace implementation.
 */
export function ProductTraceabilityPage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return <Navigate to="/marketplace" replace />;
  }

  return <Navigate to={`/trace/${encodeURIComponent(slug)}`} replace />;
}
