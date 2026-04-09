'use client';

import { useState } from 'react';
import { GalleryItem, GallerySectionKey } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { uploadGalleryImage } from '@/lib/customization/hooks';
import { Button } from '@/components/ui/button';
import { Upload, Trash2 } from 'lucide-react';

interface GallerySectionItemProps {
  businessId: string;
  sectionKey: GallerySectionKey;
  currentItem?: GalleryItem;
  onUploadComplete: () => void;
}

export default function GallerySectionItem({
  businessId,
  sectionKey,
  currentItem,
  onUploadComplete,
}: GallerySectionItemProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
        title: 'Success',
        description: `${sectionKey} photo uploaded!`,
        variant: 'default',
      });
      
      onUploadComplete();
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

  const handleDelete = async () => {
    if (!currentItem) return;
    try {
      const response = await fetch(
        `/api/gallery/${businessId}/${currentItem.id}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to delete');
      toast({
        title: 'Deleted',
        description: 'Photo removed',
      });
      onUploadComplete();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete photo',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Image Preview */}
      {currentItem?.image_url && (
        <div className="relative group overflow-hidden rounded-lg">
          <img
            src={currentItem.image_url}
            alt={currentItem.alt_text || sectionKey}
            className="w-full h-48 object-cover rounded-lg border border-[rgba(120,120,255,0.12)] transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-500/80 hover:bg-red-500"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Photo
            </Button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-[#4f8ef7] bg-[#4f8ef7]/10'
            : 'border-[rgba(120,120,255,0.22)] bg-[#0a0a0f] hover:border-[#4f8ef7]/50'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          disabled={isUploading}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
        />

        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <>
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#8888aa] border-t-[#4f8ef7]"></div>
              <p className="text-sm text-[#8888aa]">Uploading...</p>
            </>
          ) : (
            <>
              <div className="p-3 bg-[#4f8ef7]/10 rounded-full">
                <Upload className="w-6 h-6 text-[#4f8ef7]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#e8e8f0]">
                  {isDragging ? 'Drop to upload' : 'Drag and drop your image'}
                </p>
                <p className="text-xs text-[#5a5a7a] mt-1">or click to browse</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Format Guide */}
      <p className="text-xs text-[#5a5a7a] text-center">
        Recommended: JPG or PNG, high resolution (at least 1200x800px)
      </p>
    </div>
  );
}
