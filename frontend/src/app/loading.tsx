import { LoadingOverlay } from '@/components/LoadingOverlay';

export default function Loading() {
  return (
    <LoadingOverlay
      message="Loading..."
      subMessage="Please wait a moment"
      showProgress={false}
    />
  );
}