'use client';

import useSWR from 'swr';
import { WebsiteCustomization, GalleryItem } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCustomization(businessId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `/api/customization/${businessId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    customization: data as WebsiteCustomization | undefined,
    isLoading,
    error,
    refetch: mutate,
  };
}

export function useGalleryItems(businessId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `/api/gallery/${businessId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    galleryItems: (data as GalleryItem[]) || [],
    isLoading,
    error,
    refetch: mutate,
  };
}

// Mutation: Update customization
export async function updateCustomization(
  businessId: string,
  updates: Partial<WebsiteCustomization>
) {
  const res = await fetch(`/api/customization/${businessId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!res.ok) throw new Error('Failed to update customization');
  return res.json();
}

// Mutation: Upload gallery image
export async function uploadGalleryImage(
  businessId: string,
  sectionKey: string,
  file: File
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('section_key', sectionKey);

  const res = await fetch(`/api/gallery/${businessId}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Failed to upload image');
  return res.json();
}
