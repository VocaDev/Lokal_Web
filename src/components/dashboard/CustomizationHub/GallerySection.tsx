'use client';

import { useCustomization, useGalleryItems } from '@/lib/customization/hooks';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import GallerySectionItem from './GallerySectionItem';
import { GallerySectionKey } from '@/lib/types';
import { Sparkles } from 'lucide-react';

interface GallerySectionProps {
  businessId: string;
}

const SECTIONS: {
  key: GallerySectionKey;
  label: string;
  description: string;
  recommendation: string;
  multiple: boolean;
}[] = [
  {
    key: 'hero',
    label: 'Hero Photo',
    description: 'The main banner at the top of your website.',
    recommendation:
      'Wide landscape photo, ideally 1920×1080 or larger. This is the first thing visitors see — pick something that represents your business at its best.',
    multiple: false,
  },
  {
    key: 'story',
    label: 'Story Photo',
    description: 'Image for the about / story section of your site.',
    recommendation:
      'A photo that shows the people, place, or work behind your business. Square or portrait works well here.',
    multiple: false,
  },
  {
    key: 'services',
    label: 'Service Photos',
    description: 'Photos shown alongside your services. You can upload several.',
    recommendation:
      'Close-ups of work you have done, finished products, or the experience of receiving your service. Add up to 6.',
    multiple: true,
  },
  {
    key: 'gallery',
    label: 'Gallery',
    description: 'A collection of photos for the standalone gallery section.',
    recommendation:
      'Anything that shows off your business. Multiple photos compose better than just one.',
    multiple: true,
  },
];

export default function GallerySection({ businessId }: GallerySectionProps) {
  const { galleryItems, refetch } = useGalleryItems(businessId);
  const { customization } = useCustomization(businessId);

  // AI captions are only emitted for hero + story (the single-image slots).
  // Albanian is the default UX language; switch the prefix to English when
  // the site_language is set to 'en'.
  const language = customization?.site_language ?? 'sq';
  const aiPrefix = language === 'en' ? 'AI suggested' : 'AI sugjeroi';
  const captionFor = (key: GallerySectionKey): string | null => {
    if (key === 'hero') return customization?.hero_photo_caption ?? null;
    if (key === 'story') return customization?.story_photo_caption ?? null;
    return null;
  };

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="w-full space-y-2">
        {SECTIONS.map(({ key, label, description, recommendation, multiple }) => {
          const items = (galleryItems || []).filter((i) => i.section_key === key);
          const aiCaption = captionFor(key);

          return (
            <AccordionItem
              key={key}
              value={key}
              className="bg-background border border-border rounded-lg px-4 py-3"
            >
              <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors">
                <div className="text-left">
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    {label}
                    {multiple && items.length > 0 && (
                      <span className="text-xs font-normal text-muted-foreground">
                        ({items.length})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 border-t border-border/60 space-y-3">
                <p className="text-xs text-muted-foreground/90 leading-relaxed">
                  {recommendation}
                </p>
                {aiCaption && (
                  <p className="flex items-start gap-1.5 text-xs italic text-muted-foreground leading-relaxed">
                    <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                    <span>
                      <span className="font-semibold not-italic text-primary/90 mr-1">
                        {aiPrefix}:
                      </span>
                      {aiCaption}
                    </span>
                  </p>
                )}
                <GallerySectionItem
                  businessId={businessId}
                  sectionKey={key}
                  items={items}
                  mode={multiple ? 'multiple' : 'single'}
                  onChange={() => refetch()}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
