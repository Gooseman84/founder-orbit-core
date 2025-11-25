import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FeedCard } from "@/components/feed/FeedCard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { recordXpEvent } from "@/lib/xpEngine";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles, AlertCircle } from "lucide-react";

interface FeedItem {
  id: string;
  user_id: string;
  idea_id: string | null;
  type: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_action: string | null;
  xp_reward: number | null;
  metadata: any;
  created_at: string;
}

export default function Feed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [viewedItems, setViewedItems] = useState<Set<string>>(new Set());
  const viewedItemsRef = useRef<Set<string>>(new Set());

  const loadFeedItems = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("feed_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading feed items:", error);
        toast.error("Failed to load feed items");
        return;
      }

      setFeedItems(data || []);
    } catch (error) {
      console.error("Error loading feed:", error);
      toast.error("Failed to load feed items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedItems();
  }, [user]);

  // Award XP when items first appear (viewed on mount)
  useEffect(() => {
    if (!user || feedItems.length === 0) return;

    feedItems.forEach((item) => {
      if (!viewedItemsRef.current.has(item.id)) {
        viewedItemsRef.current.add(item.id);
        
        // Award XP for viewing the feed item
        const xpAmount = item.xp_reward || 2;
        recordXpEvent(user.id, "feed_view", xpAmount, {
          feedItemId: item.id,
          feedItemType: item.type,
        });
      }
    });
  }, [feedItems, user]);

  const handleGenerateFeed = async () => {
    if (!user) return;

    try {
      setGenerating(true);
      toast.info("Generating personalized feed items...");

      const { data, error } = await supabase.functions.invoke("generate-feed-items", {
        body: { userId: user.id },
      });

      if (error) {
        console.error("Error generating feed:", error);
        toast.error("Failed to generate feed items");
        return;
      }

      toast.success(`Generated ${data.items?.length || 0} new feed items!`);
      
      // Refresh feed items
      await loadFeedItems();
    } catch (error) {
      console.error("Error generating feed:", error);
      toast.error("Failed to generate feed items");
    } finally {
      setGenerating(false);
    }
  };

  const handleCtaClick = async (item: FeedItem) => {
    if (!user) return;

    // Handle the CTA action (navigation)
    if (item.cta_action) {
      if (item.cta_action.startsWith("/")) {
        navigate(item.cta_action);
      } else if (item.cta_action.startsWith("http")) {
        window.open(item.cta_action, "_blank");
      }
    }
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
          variant="default"
          size="sm"
          onClick={handleGenerateFeed}
          disabled={generating}
          className="gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Today's Feed
            </>
          )}
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          💡 View feed items to earn XP and interact with them for bonus rewards!
        </AlertDescription>
      </Alert>

      {/* Feed Items */}
      {feedItems.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">
            No feed items available yet. Generate your personalized feed to get started!
          </p>
          <Button onClick={handleGenerateFeed} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Feed
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {feedItems.map((item) => (
            <FeedCard key={item.id} item={item} onClick={handleCtaClick} />
          ))}
        </div>
      )}
    </div>
  );
}
