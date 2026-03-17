'use client'
import { useEffect, useState } from "react";
import { Business } from "@/lib/types";
import { addGalleryImage, removeGalleryImage, getCurrentBusiness } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GalleryPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    getCurrentBusiness()
      .then(biz => {
        setBusiness(biz);
        if (biz?.galleryImages) {
          setImages(biz.galleryImages);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      (async () => {
        try {
          if (!business?.id) return;
          await addGalleryImage(business.id, url);
          setImages(prev => [...prev, url]);
          toast({ title: "Image added" });
        } catch (err) {
          console.error("Failed to add gallery image", err);
          toast({ title: "Failed to add image", variant: "destructive" });
        }
      })();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDelete = async (url: string) => {
    try {
      if (!business?.id) return;
      await removeGalleryImage(business.id, url);
      setImages(prev => prev.filter(u => u !== url));
    } catch (err) {
      console.error("Failed to remove gallery image", err);
      toast({ title: "Failed to remove image", variant: "destructive" });
    }
  };

  if (loading || !business) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        Loading gallery...
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gallery</h1>
        <Button size="sm" asChild>
          <label className="cursor-pointer">
            <Upload className="h-4 w-4 mr-1" /> Upload Image
            <Input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        </Button>
      </div>

      {images.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No images yet. Upload photos to showcase your business.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((url, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border bg-card aspect-square">
              <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(url)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

