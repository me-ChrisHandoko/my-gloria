import { LoadingOverlay } from '@/components/LoadingOverlay';

export default function DashboardLoading() {
  return (
    <LoadingOverlay
      message="Loading dashboard..."
      subMessage="Preparing your workspace"
      showProgress={true}
      minDuration={1000}
    />
  );
}