import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeedCard } from "@/components/feed/FeedCard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getFeedItemsForUser } from "@/lib/feedEngine";
import { recordXpEvent } from "@/lib/xpEngine";
import { XP_EVENT_TYPES } from "@/types/xp";
import { FeedItem } from "@/types/feed";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles, AlertCircle } from "lucide-react";

export default function Feed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [viewedItems, setViewedItems] = useState<Set<string>>(new Set());

  const loadFeedItems = async (isRefresh = false) => {
    if (!user) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const items = await getFeedItemsForUser(user.id);
      setFeedItems(items);

      // Award XP for viewing feed (only on initial load, not refresh)
      if (!isRefresh && items.length > 0) {
        await recordXpEvent(user.id, XP_EVENT_TYPES.FEED_VIEW, 2, {
          item_count: items.length,
        });
      }

      if (isRefresh) {
        toast.success("Feed refreshed!");
      }
    } catch (error) {
      console.error("Error loading feed:", error);
      toast.error("Failed to load feed items");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeedItems();
  }, [user]);

  const handleCtaClick = async (item: FeedItem) => {
    if (!user) return;

    // Mark as viewed and award XP if not already viewed
    if (!viewedItems.has(item.id)) {
      setViewedItems(prev => new Set(prev).add(item.id));
      
      // Award XP for interacting with feed item
      if (item.xpReward) {
        await recordXpEvent(user.id, 'feed_action', item.xpReward, {
          item_id: item.id,
          item_type: item.type,
          action: 'cta_click',
        });
        toast.success(`+${item.xpReward} XP earned!`);
      }
    }

    // Handle the CTA action
    if (item.ctaAction) {
      if (item.ctaAction.startsWith('/')) {
        navigate(item.ctaAction);
      } else if (item.ctaAction.startsWith('http')) {
        window.open(item.ctaAction, '_blank');
      }
    }
  };

  const handleRefresh = () => {
    loadFeedItems(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your personalized feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Your Feed</h1>
          </div>
          <p className="text-muted-foreground">
            Personalized insights and actions for your founder journey
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          {refreshing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          💡 Interact with feed items to earn XP and stay on track with your goals!
        </AlertDescription>
      </Alert>

      {/* Feed Items */}
      {feedItems.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">
            No feed items available yet. Complete your profile and choose an idea to get personalized insights!
          </p>
          <Button onClick={() => navigate("/ideas")}>
            View Ideas
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {feedItems.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              onClick={handleCtaClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
