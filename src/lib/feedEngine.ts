// Feed engine for generating micro insights and competitor signals

import { supabase } from "@/integrations/supabase/client";
import { FeedItem, FeedContext } from "@/types/feed";

// Valid feed item types
export const FEED_TYPES = ["insight", "idea_tweak", "competitor_snapshot", "micro_task"] as const;

/**
 * Build feed input for AI generation
 * @param userId - The user's ID
 * @returns Object with founder_profile, idea, and analysis for LLM
 */
export async function buildFeedInput(userId: string) {
  try {
    // Fetch founder profile
    const { data: founder_profile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching founder profile:", profileError);
    }

    // Fetch chosen idea
    const { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "chosen")
      .maybeSingle();

    if (ideaError) {
      console.error("Error fetching chosen idea:", ideaError);
    }

    // Fetch latest idea analysis if idea exists
    let analysis = null;
    if (idea) {
      const { data: analysisData, error: analysisError } = await supabase
        .from("idea_analysis")
        .select("*")
        .eq("idea_id", idea.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (analysisError) {
        console.error("Error fetching idea analysis:", analysisError);
      } else {
        analysis = analysisData;
      }
    }

    return {
      founder_profile: founder_profile || null,
      idea: idea || null,
      analysis: analysis || null,
    };
  } catch (error) {
    console.error("Error building feed input:", error);
    return {
      founder_profile: null,
      idea: null,
      analysis: null,
    };
  }
}

/**
 * Format and validate raw feed items from AI
 * @param rawItems - Raw items from LLM response
 * @returns Validated and formatted feed items
 */
export function formatFeedItems(rawItems: any[]): any[] {
  if (!Array.isArray(rawItems)) {
    console.error("formatFeedItems: rawItems is not an array");
    return [];
  }

  return rawItems
    .filter((item) => {
      // Validate required fields
      if (!item.type || !item.title || !item.body) {
        console.warn("formatFeedItems: skipping item missing required fields", item);
        return false;
      }
      // Validate type
      if (!FEED_TYPES.includes(item.type)) {
        console.warn("formatFeedItems: skipping item with invalid type", item.type);
        return false;
      }
      return true;
    })
    .map((item) => ({
      type: item.type,
      title: item.title,
      body: item.body,
      cta_label: item.cta_label || null,
      cta_action: item.cta_action || null,
      xp_reward: typeof item.xp_reward === "number" ? item.xp_reward : 2,
      metadata: item.metadata || {},
    }));
}

/**
 * Get personalized feed items for a user
 * @param userId - The user's ID
 * @returns Array of feed items tailored to the user's journey
 */
export async function getFeedItemsForUser(userId: string): Promise<FeedItem[]> {
  try {
    // Fetch user's chosen idea
    const { data: chosenIdea } = await supabase
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "chosen")
      .maybeSingle();

    // Fetch idea analysis if available
    let analysis = null;
    if (chosenIdea) {
      const { data: analysisData } = await supabase
        .from("idea_analysis")
        .select("*")
        .eq("idea_id", chosenIdea.id)
        .maybeSingle();
      analysis = analysisData;
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Build context for feed generation
    const context: FeedContext = {
      userId,
      chosenIdeaTitle: chosenIdea?.title,
      chosenIdeaDescription: chosenIdea?.description || undefined,
      businessModelType: chosenIdea?.business_model_type || undefined,
      targetCustomer: chosenIdea?.target_customer || undefined,
      nicheScore: analysis?.niche_score || undefined,
      mainRisks: analysis?.main_risks || undefined,
      userSkills: profile?.skills_tags || undefined,
      userPassions: profile?.passions_tags || undefined,
    };

    // Generate mock feed items based on context
    return generateMockFeedItems(context);
  } catch (error) {
    console.error("Error fetching feed items:", error);
    return [];
  }
}

/**
 * Generate mock feed items based on user context
 * TODO: Replace with AI-generated content from edge function
 */
function generateMockFeedItems(context: FeedContext): FeedItem[] {
  const items: FeedItem[] = [];
  const hasChosenIdea = !!context.chosenIdeaTitle;

  // Insight items
  if (hasChosenIdea) {
    items.push({
      id: `insight-${Date.now()}-1`,
      type: 'insight',
      title: '🎯 Market Timing Matters',
      body: `For ${context.chosenIdeaTitle || 'your idea'}, entering the market now could be advantageous. Recent trends show increased demand for ${context.businessModelType || 'this type of solution'}. Consider conducting customer interviews this week to validate interest.`,
      ctaLabel: 'Create Interview Task',
      ctaAction: '/tasks',
      xpReward: 5,
    });

    items.push({
      id: `insight-${Date.now()}-2`,
      type: 'insight',
      title: '📊 Pricing Intelligence',
      body: `Based on ${context.targetCustomer || 'your target market'}, competitors are typically pricing between $29-99/month. Your unique value proposition could justify premium positioning if you emphasize ${context.userSkills?.[0] || 'your core strength'}.`,
      xpReward: 5,
    });
  } else {
    items.push({
      id: `insight-${Date.now()}-3`,
      type: 'insight',
      title: '💡 Ready to Choose Your Path?',
      body: 'You have generated several ideas. Take time to analyze and vet them thoroughly. The right idea aligns with your skills, passions, and constraints.',
      ctaLabel: 'View Ideas',
      ctaAction: '/ideas',
    });
  }

  // Micro task suggestions
  items.push({
    id: `task-${Date.now()}-1`,
    type: 'micro_task_suggestion',
    title: '✅ Quick Win: Define Your MVP',
    body: hasChosenIdea 
      ? `Spend 15 minutes listing the absolute minimum features needed for ${context.chosenIdeaTitle} to solve your customer's core problem. Remove everything else.`
      : 'Once you choose an idea, defining your MVP will be your first strategic step.',
    ctaLabel: hasChosenIdea ? 'Add to Tasks' : 'Choose an Idea',
    ctaAction: hasChosenIdea ? '/tasks' : '/ideas',
    xpReward: 20,
  });

  if (hasChosenIdea && context.userSkills && context.userSkills.length > 0) {
    items.push({
      id: `task-${Date.now()}-2`,
      type: 'micro_task_suggestion',
      title: '🚀 Leverage Your Skills',
      body: `With your background in ${context.userSkills[0]}, you could build a proof of concept this week. Start with a simple landing page to test messaging.`,
      ctaLabel: 'Plan This Out',
      ctaAction: '/tasks',
      xpReward: 25,
    });
  }

  // Idea tweaks
  if (hasChosenIdea && context.nicheScore && context.nicheScore < 70) {
    items.push({
      id: `tweak-${Date.now()}-1`,
      type: 'idea_tweak',
      title: '🔧 Niche Down Opportunity',
      body: `Your niche score is ${context.nicheScore}/100. Consider narrowing your target from "${context.targetCustomer}" to a more specific sub-segment. This can reduce competition and increase conversion rates by 2-3x.`,
      ctaLabel: 'Re-analyze Idea',
      ctaAction: `/ideas/${context.userId}`,
      xpReward: 10,
    });
  }

  if (hasChosenIdea && context.mainRisks && context.mainRisks.length > 0) {
    const topRisk = Array.isArray(context.mainRisks) ? context.mainRisks[0] : 'market saturation';
    items.push({
      id: `tweak-${Date.now()}-2`,
      type: 'idea_tweak',
      title: '⚠️ Risk Mitigation Strategy',
      body: `Your top identified risk is: ${topRisk}. Consider adding a unique angle or proprietary process that addresses this concern directly. Differentiation is key.`,
      xpReward: 10,
    });
  }

  // Competitor signals
  if (hasChosenIdea) {
    items.push({
      id: `competitor-${Date.now()}-1`,
      type: 'competitor_signal',
      title: '👀 Competitor Activity Detected',
      body: `A similar solution in the ${context.businessModelType || 'space'} recently raised funding. This validates market demand. Use this as proof when pitching to early customers or investors.`,
      xpReward: 5,
    });
  }

  // Motivation
  items.push({
    id: `motivation-${Date.now()}-1`,
    type: 'motivation',
    title: '💪 Keep Building',
    body: hasChosenIdea 
      ? `Every successful founder started exactly where you are. ${context.chosenIdeaTitle} has potential—focus on talking to customers and iterating based on their feedback.`
      : 'The journey of a thousand miles begins with a single step. Generate some ideas and start exploring what resonates with you.',
    xpReward: 2,
  });

  // Market trends
  if (hasChosenIdea && context.businessModelType) {
    items.push({
      id: `trend-${Date.now()}-1`,
      type: 'market_trend',
      title: '📈 Market Trend Alert',
      body: `The ${context.businessModelType} model is seeing 23% year-over-year growth. Investors are actively looking for solutions in this space. Now is a great time to build momentum.`,
      xpReward: 5,
    });
  }

  return items;
}

/**
 * Get a single feed item by ID
 * TODO: Implement if needed for individual item actions
 */
export async function getFeedItemById(itemId: string): Promise<FeedItem | null> {
  // Mock implementation - in production this might fetch from a feed_items table
  console.warn('getFeedItemById not yet implemented:', itemId);
  return null;
}
