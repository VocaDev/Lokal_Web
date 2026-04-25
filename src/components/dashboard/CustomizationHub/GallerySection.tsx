'use client';

import { useGalleryItems } from '@/lib/customization/hooks';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import GallerySectionItem from './GallerySectionItem';
import { GallerySectionKey } from '@/lib/types';

interface GallerySectionProps {
  businessId: string;
}

const SECTIONS: { key: GallerySectionKey; label: string; description: string }[] = [
  { key: 'hero', label: 'Hero Photo', description: 'Main banner image for your website' },
  { key: 'about', label: 'About Photo', description: 'Photo for your about/story section' },
  { key: 'services', label: 'Services Photo', description: 'Showcase your services' },
  { key: 'team', label: 'Team Photo', description: 'Team members or staff photo' },
  { key: 'contact', label: 'Contact Photo', description: 'Photo for contact section' },
];

export default function GallerySection({ businessId }: GallerySectionProps) {
  const { galleryItems, refetch } = useGalleryItems(businessId);

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="w-full space-y-2">
        {SECTIONS.map(({ key, label, description }) => {
          const item = galleryItems?.find((i) => i.section_key === key);

          return (
            <AccordionItem
              key={key}
              value={key}
              className="bg-background border border-border rounded-lg px-4 py-3"
            >
              <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors">
                <div className="text-left">
                  <p className="font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 border-t border-border/60">
                <GallerySectionItem
                  businessId={businessId}
                  sectionKey={key}
                  currentItem={item}
                  onUploadComplete={() => refetch()}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
