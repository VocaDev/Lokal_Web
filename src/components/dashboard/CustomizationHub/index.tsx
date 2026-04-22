'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomization, useGalleryItems } from '@/lib/customization/hooks';
import { WebsiteCustomization } from '@/lib/types';
import ColorSection from './ColorSection';
import TypographySection from './TypographySection';
import LayoutSection from './LayoutSection';
import GallerySection from './GallerySection';
import PreviewPane from './PreviewPane';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface CustomizationHubProps {
  businessId: string;
}

export default function CustomizationHub({ businessId }: CustomizationHubProps) {
  const { customization, isLoading: customLoading, refetch } = useCustomization(businessId);
  const { galleryItems } = useGalleryItems(businessId);
  const { toast } = useToast();
  const router = useRouter();

  const handleRegenerateWebsite = () => {
    if (!confirm("This will replace your current website. Are you sure?")) return;
    router.push('/register/website-builder-choice');
  };

  // Local form state (not persisted until Save clicked)
  const [formData, setFormData] = useState<Partial<WebsiteCustomization>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('customize');

  // Initialize form with fetched customization
  useEffect(() => {
    if (customization) {
      setFormData(customization);
    }
  }, [customization]);

  // Handle field changes
  const handleChange = (field: keyof WebsiteCustomization, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Save all changes to database
  const handleSave = async () => {
    try {
      setIsSaving(true);

      const response = await fetch(`/api/customization/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save customization');

      await refetch();

      toast({
        title: 'Success',
        description: 'Website customization saved!',
        variant: 'default',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (customLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#8888aa] border-t-[#4f8ef7]"></div>
          <p className="mt-4 text-[#8888aa]">Loading customization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#e8e8f0]">Website Customization</h1>
          <p className="text-[#8888aa] mt-2">
            Customize colors, fonts, layout, and upload photos for your website
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end">
          <button
            onClick={handleRegenerateWebsite}
            className="border border-blue-400 text-blue-400 rounded-lg px-5 py-2.5 hover:bg-blue-400/10 font-semibold transition-all duration-200"
          >
            Regenerate Website
          </button>
          <p className="text-[#8888aa] text-xs mt-1">Your previous website will be replaced.</p>
        </div>
      </div>

      {/* Two-Tab Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#151522] border border-[rgba(120,120,255,0.12)]">
          <TabsTrigger 
            value="customize"
            className="data-[state=active]:bg-[#4f8ef7]/15 data-[state=active]:text-[#4f8ef7]"
          >
            Customize
          </TabsTrigger>
          <TabsTrigger 
            value="preview"
            className="data-[state=active]:bg-[#4f8ef7]/15 data-[state=active]:text-[#4f8ef7]"
          >
            Preview
          </TabsTrigger>
        </TabsList>

        {/* CUSTOMIZE TAB */}
        <TabsContent value="customize" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: All Form Sections */}
            <div className="space-y-6">
              {/* Colors */}
              <div className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-6">
                <h2 className="text-xl font-bold text-[#e8e8f0] mb-6">Colors</h2>
                <ColorSection formData={formData} onChange={handleChange} />
              </div>

              {/* Typography */}
              <div className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-6">
                <h2 className="text-xl font-bold text-[#e8e8f0] mb-6">Typography</h2>
                <TypographySection formData={formData} onChange={handleChange} />
              </div>

              {/* Layout */}
              <div className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-6">
                <h2 className="text-xl font-bold text-[#e8e8f0] mb-6">Layout & Visibility</h2>
                <LayoutSection formData={formData} onChange={handleChange} />
              </div>
            </div>

            {/* Right Column: Gallery on Desktop, Hidden on Mobile */}
            <div className="hidden lg:block">
              <div className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-6 sticky top-20">
                <h2 className="text-xl font-bold text-[#e8e8f0] mb-6">Gallery Preview</h2>
                <p className="text-[#8888aa] text-sm">
                  Photos will appear here after upload
                </p>
                <div className="mt-4 space-y-3">
                  {galleryItems?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-[#0a0a0f] rounded-lg border border-[rgba(120,120,255,0.12)] flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.alt_text}
                            className="h-full w-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-[#5a5a7a] text-xs">Empty</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#e8e8f0] capitalize">
                          {item.section_key}
                        </p>
                        <p className="text-xs text-[#5a5a7a]">
                          {item.image_url ? 'Uploaded' : 'No image'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Gallery Section - Full Width Below on Mobile */}
          <div className="lg:hidden">
            <div className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-6">
              <h2 className="text-xl font-bold text-[#e8e8f0] mb-6">Gallery</h2>
              <GallerySection businessId={businessId} />
            </div>
          </div>

          {/* Gallery Section - Inside the Grid on Desktop */}
          <div className="col-span-1 lg:col-span-2">
            <div className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl p-6">
              <h2 className="text-xl font-bold text-[#e8e8f0] mb-6">Photo Gallery</h2>
              <GallerySection businessId={businessId} />
            </div>
          </div>

          {/* Save Button - Sticky at Bottom */}
          <div className="sticky bottom-0 bg-[#0a0a0f] border-t border-[rgba(120,120,255,0.12)] py-4 flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-[#4f8ef7] to-[#8b5cf6] text-white font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setFormData(customization || {})}
              className="px-6"
            >
              Cancel
            </Button>
          </div>
        </TabsContent>

        {/* PREVIEW TAB */}
        <TabsContent value="preview" className="mt-6">
          <PreviewPane 
            customization={formData as WebsiteCustomization} 
            businessId={businessId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
