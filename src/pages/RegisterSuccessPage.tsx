import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, LayoutDashboard } from "lucide-react";

export default function RegisterSuccessPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const business = location.state?.business;

    if (!business) {
        navigate("/register");
        return null;
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="flex justify-center">
                    <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mb-2">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-foreground">Your website is live!</h1>
                    <p className="text-muted-foreground text-lg">
                        Congratulations on launching your business online.
                    </p>
                </div>

                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                    <p className="text-sm font-medium text-foreground">Your public website link:</p>
                    <a
                        href={`/${business.subdomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg text-primary hover:underline font-medium break-all"
                    >
                        lokalweb.com/{business.subdomain}
                        <ExternalLink className="h-4 w-4 shrink-0" />
                    </a>
                </div>

                <Button
                    size="lg"
                    className="w-full gap-2 text-md h-12"
                    onClick={() => navigate("/dashboard")}
                >
                    <LayoutDashboard className="h-5 w-5" />
                    Go to Dashboard
                </Button>
            </div>
        </div>
    );
}
