import { useOutletContext } from "react-router-dom";
import { Business } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Globe, Building } from "lucide-react";

export default function ProfilePage() {
  const { business } = useOutletContext<{ business: Business }>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Business Profile</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-lg">{business.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground capitalize">{business.industry.replace("-", " ")}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{business.phone || "Not set"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-primary">{business.subdomain}.lokalweb.com</span>
          </div>
          {business.description && (
            <p className="text-sm text-muted-foreground pt-2 border-t">{business.description}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
