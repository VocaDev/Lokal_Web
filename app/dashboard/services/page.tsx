'use client'
import { useEffect, useState } from "react";
import { Business, Service } from "@/lib/types";
import { updateService, deleteService, getServices, getCurrentBusiness } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ServicesPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);

  const emptyService: Service = { id: "", businessId: "", name: "", description: "", price: 0, durationMinutes: 30 };

  useEffect(() => {
    getCurrentBusiness()
      .then(biz => {
        setBusiness(biz);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!business?.id) return;
    (async () => {
      try {
        const data = await getServices(business.id);
        setServices(data);
      } catch (err) {
        console.error("Failed to load services", err);
      }
    })();
  }, [business?.id]);

  const handleSave = async (s: Service) => {
    if (!business?.id) return;
    const svc = s.id ? s : { ...s, id: crypto.randomUUID(), businessId: business.id };
    try {
      await updateService(business.id, svc);
      const updated = await getServices(business.id);
      setServices(updated);
      setOpen(false);
      setEditing(null);
    } catch (err) {
      console.error("Failed to save service", err);
    }
  };

  const handleConfirmedDelete = async () => {
    if (!business?.id || !confirmDelete) return;
    const target = confirmDelete;
    const previous = services;

    // Optimistic: remove from UI first, close dialog, then call API.
    setServices(prev => prev.filter(x => x.id !== target.id));
    setConfirmDelete(null);
    setDeletingId(target.id);
    setDeleteError(null);

    try {
      await deleteService(business.id, target.id);
      // Refetch to stay in sync with the DB (handles edge cases like FK
      // cascades or concurrent edits).
      const updated = await getServices(business.id);
      setServices(updated);
    } catch (err: any) {
      console.error("Failed to delete service", err);
      // Revert optimistic removal and surface the error inline.
      setServices(previous);
      setDeleteError({
        id: target.id,
        message: err?.message || "Could not delete this service. Try again.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || !business) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        Loading services...
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Services</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(emptyService)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Service</DialogTitle></DialogHeader>
            <ServiceForm service={editing || emptyService} onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
          Asnjë shërbim ende. Kliko <span className="font-medium text-foreground">Add Service</span> për të filluar.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map(s => {
          const isDeleting = deletingId === s.id;
          const errorForCard = deleteError?.id === s.id ? deleteError.message : null;
          return (
            <Card
              key={s.id}
              className={cn(
                "transition-opacity",
                isDeleting && "opacity-50 pointer-events-none",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="truncate">{s.name}</span>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => { setEditing(s); setOpen(true); }}
                      disabled={isDeleting}
                      aria-label={`Edit ${s.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setDeleteError(null);
                        setConfirmDelete(s);
                      }}
                      disabled={isDeleting}
                      aria-label={`Delete ${s.name}`}
                    >
                      {isDeleting
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">€{s.price}</p>
                <p className="text-sm text-muted-foreground">{s.durationMinutes} min</p>
                {errorForCard && (
                  <p
                    className="mt-3 text-xs text-destructive"
                    role="alert"
                  >
                    {errorForCard}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(next) => { if (!next) setConfirmDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {confirmDelete?.name ? `"${confirmDelete.name}"` : "this service"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the service from your public site immediately. Existing
              bookings for this service are kept, but customers will no longer be able to
              book it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ServiceForm({ service, onSave }: { service: Service; onSave: (s: Service) => void }) {
  const [form, setForm] = useState(service);
  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <Label>Description</Label>
        <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div>
        <Label>Price (€)</Label>
        <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
      </div>
      <div>
        <Label>Duration (min)</Label>
        <Input type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} />
      </div>
      <Button className="w-full" onClick={() => onSave(form)}>Save</Button>
    </div>
  );
}
