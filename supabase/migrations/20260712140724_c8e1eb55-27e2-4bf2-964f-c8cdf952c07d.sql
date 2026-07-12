
CREATE OR REPLACE VIEW public.v_active_bottleneck AS
WITH agg AS (
  SELECT mp.id AS money_path_id,
         mp.user_id,
         mp.offer_locked_at,
         count(bc.id) AS total_conv,
         count(bc.id) FILTER (WHERE bc.status = ANY (ARRAY['contacted','replied','call_booked','offer_sent','won','lost','ghosted']::conversation_status[])) AS contacted_count,
         count(bc.id) FILTER (WHERE bc.status = ANY (ARRAY['replied','call_booked','offer_sent','won','lost']::conversation_status[])) AS replied_count,
         count(bc.id) FILTER (WHERE bc.status = ANY (ARRAY['call_booked','offer_sent','won','lost']::conversation_status[])) AS call_booked_count,
         count(bc.id) FILTER (WHERE bc.status = ANY (ARRAY['offer_sent','won','lost']::conversation_status[])) AS offer_sent_count,
         count(bc.id) FILTER (WHERE bc.status = 'won'::conversation_status)  AS won_count,
         count(bc.id) FILTER (WHERE bc.status = 'lost'::conversation_status) AS lost_count,
         count(bc.id) FILTER (WHERE bc.status = 'lost'::conversation_status
                              AND bc.loss_reason IS NULL
                              AND bc.updated_at >= now() - interval '30 days') AS lost_recent_unknown,
         count(bc.id) FILTER (WHERE bc.status = 'lost'::conversation_status
                              AND bc.updated_at >= now() - interval '30 days') AS lost_recent_total,
         (SELECT count(*) FROM public.revenue_events re WHERE re.money_path_id = mp.id) AS revenue_count
  FROM public.money_paths mp
  LEFT JOIN public.buyer_conversations bc ON bc.money_path_id = mp.id
  GROUP BY mp.id, mp.user_id, mp.offer_locked_at
)
SELECT money_path_id, user_id,
  CASE
    WHEN offer_locked_at IS NULL                                   THEN 'B_NO_OFFER'::bottleneck_kind
    WHEN revenue_count BETWEEN 1 AND 2                             THEN 'B_NOT_YET_REPEATABLE'::bottleneck_kind
    WHEN total_conv = 0                                            THEN 'B_NO_BUYER_LIST'::bottleneck_kind
    WHEN contacted_count = 0                                       THEN 'B_NO_OUTREACH'::bottleneck_kind
    WHEN replied_count = 0                                         THEN 'B_NO_REPLIES'::bottleneck_kind
    WHEN call_booked_count = 0                                     THEN 'B_REPLIES_NO_CALLS'::bottleneck_kind
    WHEN offer_sent_count = 0                                      THEN 'B_CALLS_NO_OFFERS'::bottleneck_kind
    WHEN won_count = 0 AND lost_recent_total > 0
         AND lost_recent_unknown * 2 >= lost_recent_total          THEN 'B_LOSS_REASON_UNKNOWN'::bottleneck_kind
    ELSE 'B_OFFERS_NO_CLOSE'::bottleneck_kind
  END AS bottleneck
FROM agg;
