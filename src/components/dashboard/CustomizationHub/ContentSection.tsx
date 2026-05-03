'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type {
  AiSection,
  AiHeroSection,
  AiStorySection,
} from '@/lib/types/customization';

interface ContentSectionProps {
  businessId: string;
  aiSections: AiSection[] | null | undefined;
  onSaved: () => void | Promise<unknown>;
}

const STORY_TARGET_WORDS = 80;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export default function ContentSection({
  businessId,
  aiSections,
  onSaved,
}: ContentSectionProps) {
  const hasAi = Array.isArray(aiSections) && aiSections.length > 0;

  const heroSection = useMemo<AiHeroSection | undefined>(
    () =>
      (aiSections ?? []).find(
        (s): s is AiHeroSection => s?.kind === 'hero',
      ),
    [aiSections],
  );
  const storySection = useMemo<AiStorySection | undefined>(
    () =>
      (aiSections ?? []).find(
        (s): s is AiStorySection => s?.kind === 'story',
      ),
    [aiSections],
  );

  const { toast } = useToast();
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [storyBody, setStoryBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync local form state whenever the canonical ai_sections change
  // (initial load, post-save refetch, regeneration).
  useEffect(() => {
    setHeadline(heroSection?.headline ?? '');
    setSubheadline(heroSection?.subheadline ?? '');
    setStoryBody(storySection?.body ?? '');
  }, [heroSection, storySection]);

  if (!hasAi) {
    return (
      <p className="text-sm text-muted-foreground">
        Edito tekstin e faqes pasi ta gjenerosh me AI.
      </p>
    );
  }

  const storyWords = countWords(storyBody);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/website-customization/content?businessId=${encodeURIComponent(businessId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hero: heroSection
              ? { headline, subheadline }
              : undefined,
            story: storySection ? { body: storyBody } : undefined,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(err?.error || 'Failed to save content');
      }
      await onSaved();
      toast({
        title: 'U ruajt',
        description: 'Teksti i faqes u përditësua.',
      });
    } catch (err: unknown) {
      toast({
        title: 'Gabim',
        description: err instanceof Error ? err.message : 'Nuk u ruajt teksti.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {heroSection && (
        <>
          <div className="space-y-2">
            <Label htmlFor="content-headline">Hero — Titulli</Label>
            <Input
              id="content-headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content-subheadline">Hero — Nëntitulli</Label>
            <Textarea
              id="content-subheadline"
              rows={2}
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              disabled={isSaving}
            />
          </div>
        </>
      )}

      {storySection && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="content-story">Story — Trupi</Label>
            <span className="text-xs text-muted-foreground">
              {storyWords} / {STORY_TARGET_WORDS} fjalë
            </span>
          </div>
          <Textarea
            id="content-story"
            rows={6}
            value={storyBody}
            onChange={(e) => setStoryBody(e.target.value)}
            disabled={isSaving}
          />
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Po ruhet...' : 'Ruaj tekstin'}
        </Button>
      </div>
    </div>
  );
}
