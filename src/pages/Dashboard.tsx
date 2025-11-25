import { useXP } from "@/hooks/useXP";
import { LevelBadge } from "@/components/shared/LevelBadge";
import { XpProgressBar } from "@/components/shared/XpProgressBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const Dashboard = () => {
  const { xpSummary, loading, error } = useXP();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your progress, manage tasks, and stay on top of your founder journey.
        </p>
      </div>

      {/* XP Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Founder Progress</CardTitle>
              <CardDescription>
                Level up by completing tasks, generating ideas, and building your business
              </CardDescription>
            </div>
            {!loading && xpSummary && <LevelBadge level={xpSummary.level} />}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : xpSummary ? (
            <XpProgressBar
              totalXp={xpSummary.totalXp}
              level={xpSummary.level}
              nextLevelXp={xpSummary.nextLevelXp}
              currentLevelMinXp={xpSummary.currentLevelMinXp}
              progressPercent={xpSummary.progressPercent}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No XP data available. Start completing tasks to earn experience!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Placeholder for future sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active Tasks</CardTitle>
            <CardDescription>Your ongoing quests and micro-tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Feed</CardTitle>
            <CardDescription>Latest insights and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
