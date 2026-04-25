'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomizationHub from '@/components/dashboard/CustomizationHub';
import { getCurrentBusiness } from '@/lib/store';

export default function CustomizationPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const business = await getCurrentBusiness();
        if (!business) {
          router.push('/dashboard');
          return;
        }
        setBusinessId(business.id);
      } catch (err) {
        console.error('Error fetching business:', err);
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusiness();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
          <p className="mt-4 text-muted-foreground">Validating session...</p>
        </div>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Business not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CustomizationHub businessId={businessId} />
    </div>
  );
}
