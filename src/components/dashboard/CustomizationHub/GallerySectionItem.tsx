'use client';

import { useState } from 'react';
import { GalleryItem, GallerySectionKey } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { uploadGalleryImage } from '@/lib/customization/hooks';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Loader2, Plus } from 'lucide-react';

interface GallerySectionItemProps {
  businessId: string;
  sectionKey: GallerySectionKey;
  items: GalleryItem[];
  mode: 'single' | 'multiple';
  onChange: () => void;
}

export default function GallerySectionItem({
  businessId,
  sectionKey,
  items,
  mode,
  onChange,
}: GallerySectionItemProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      await uploadGalleryImage(businessId, sectionKey, file);

      toast({
        title: 'Uploaded',
        description: `${sectionKey} photo added.`,
      });

      onChange();
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset so the same file can be re-selected after a failure.
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDelete = async (item: GalleryItem) => {
    setDeletingId(item.id);
    try {
      const response = await fetch(`/api/gallery/${businessId}/${item.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      toast({ title: 'Deleted', description: 'Photo removed.' });
      onChange();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete photo',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // ----------------------------------------------------------------
  // SINGLE mode — replace-on-upload, one image per slot
  // ----------------------------------------------------------------
  if (mode === 'single') {
    const current = items[0];
    return (
      <div className="space-y-4">
        {current?.image_url && (
          <div className="relative group overflow-hidden rounded-lg">
            <img
              src={current.image_url}
              alt={current.alt_text || sectionKey}
              className="w-full h-48 object-cover rounded-lg border border-border transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(current)}
                disabled={deletingId === current.id}
              >
                {deletingId === current.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <UploadDropzone
          isUploading={isUploading}
          isDragging={isDragging}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onInputChange={handleInputChange}
          replace={!!current?.image_url}
        />

        <p className="text-xs text-muted-foreground text-center">
          Recommended: JPG or PNG, high resolution (at least 1200×800px).
        </p>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // MULTIPLE mode — grid of existing images + add-tile
  // ----------------------------------------------------------------
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-background"
          >
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.alt_text || sectionKey}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(item)}
                disabled={deletingId === item.id}
              >
                {deletingId === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ))}

        {/* Add-tile — same drop zone, compact */}
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-border bg-background hover:border-primary/50'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            disabled={isUploading}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <>
              <div className="p-2 bg-primary/10 rounded-full mb-1">
                <Plus className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">
                {items.length === 0 ? 'Add photo' : 'Add another'}
              </span>
            </>
          )}
        </label>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Recommended: JPG or PNG, high resolution. Drag and drop or click an empty tile to upload.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------

function UploadDropzone({
  isUploading,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
  replace,
}: {
  isUploading: boolean;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  replace: boolean;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
        isDragging
          ? 'border-primary bg-primary/10'
          : 'border-border bg-background hover:border-primary/50'
      }`}
    >
      <input
        type="file"
        accept="image/*"
        onChange={onInputChange}
        disabled={isUploading}
        className="absolute inset-0 opacity-0 cursor-pointer z-10"
      />

      <div className="flex flex-col items-center gap-3">
        {isUploading ? (
          <>
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary"></div>
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : (
          <>
            <div className="p-3 bg-primary/10 rounded-full">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isDragging
                  ? 'Drop to upload'
                  : replace
                    ? 'Drop a new image to replace'
                    : 'Drag and drop your image'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
