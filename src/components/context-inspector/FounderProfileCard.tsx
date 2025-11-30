import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Heart, Briefcase, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FounderProfileCardProps {
  profile: any | null;
  loading?: boolean;
}

export function FounderProfileCard({ profile, loading }: FounderProfileCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Founder Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Founder Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No profile data yet. Complete onboarding to populate this.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Founder Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Passions */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Heart className="h-4 w-4 text-rose-500" />
            Passions
          </div>
          {profile.passions_text && (
            <p className="text-sm text-muted-foreground mb-2">{profile.passions_text}</p>
          )}
          {profile.passions_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {profile.passions_tags.map((tag: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Skills */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Briefcase className="h-4 w-4 text-blue-500" />
            Skills
          </div>
          {profile.skills_text && (
            <p className="text-sm text-muted-foreground mb-2">{profile.skills_text}</p>
          )}
          {profile.skills_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {profile.skills_tags.map((tag: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Constraints */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Time/Week</p>
            <p className="text-sm font-medium">{profile.time_per_week ? `${profile.time_per_week} hrs` : "Not set"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Capital</p>
            <p className="text-sm font-medium">{profile.capital_available ? `$${profile.capital_available.toLocaleString()}` : "Not set"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Risk Tolerance</p>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-muted-foreground" />
              <p className="text-sm font-medium capitalize">{profile.risk_tolerance || "Not set"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tech Level</p>
            <p className="text-sm font-medium capitalize">{profile.tech_level || "Not set"}</p>
          </div>
        </div>

        {/* Vision */}
        {profile.success_vision && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Success Vision</p>
            <p className="text-sm">{profile.success_vision}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
