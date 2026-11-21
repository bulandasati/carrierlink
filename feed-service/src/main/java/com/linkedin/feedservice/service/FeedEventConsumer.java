package com.linkedin.feedservice.service;

import com.linkedin.feedservice.client.PostServiceClient;
import com.linkedin.feedservice.client.UserServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class FeedEventConsumer {

    private final UserServiceClient userServiceClient;
    private final PostServiceClient postServiceClient;
    private static final String FEED_KEY_PREFIX = "feed:";

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${feed.max-size}")
    private int maxFeedSize;

    /**
     * Consume post.created event.
     *
     * Fan-out on write: when a user creates a post, immediately push
     * that postId into every connection's feed using a Redis Sorted Set
     * scored by the post's creation timestamp. This guarantees chronological
     * ordering even when Kafka delivers events out of order, and is idempotent
     * — re-processing the same event simply overwrites the score.
     *
     * Redis command issued per connection:
     *   ZADD feed:<userId> <timestamp_millis> <postId>
     *   ZREMRANGEBYRANK feed:<userId> 0 <(total - maxFeedSize - 1)>
     *
     * This is how LinkedIn / Twitter (X) generates personalised feeds.
     */
    @KafkaListener(topics = "post.created")
    public void consumePostCreated(
            @Payload Map<String, Object> payload) {

        try {
            String postId = (String) payload.get("postId");
            String authorId = (String) payload.get("authorId");

            // Use post createdAt timestamp as the ZSet score for chronological ordering.
            double score = System.currentTimeMillis();
            Object rawCreatedAt = payload.get("createdAt");
            if (rawCreatedAt != null) {
                try {
                    score = Double.parseDouble(rawCreatedAt.toString());
                } catch (NumberFormatException ignored) {
                    try {
                        java.time.LocalDateTime ldt = java.time.LocalDateTime.parse(rawCreatedAt.toString());
                        score = (double) ldt.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
                    } catch (Exception e) {
                        score = System.currentTimeMillis();
                    }
                }
            }

            // Get all connections of the post author
            List<Map<String, Object>> connections =
                    userServiceClient.getConnections(authorId);

            // Fan-out: push postId to each connection's sorted-set feed
            for (Map<String, Object> connection : connections) {
                String connectionId = (String) connection.get("id");
                pushToFeed(connectionId, postId, score);
            }

            // Also push to the author's own feed
            pushToFeed(authorId, postId, score);

        } catch (Exception e) {
            log.error("Error in consumePostCreated: {}", e.getMessage());
        }
    }

    /**
     * Consume connection.accepted event.
     * Backfill recent posts of newly connected users into each other's feed.
     */
    @KafkaListener(topics = "connection.accepted")
    public void consumeConnectionAccepted(
            @Payload Map<String, Object> payload) {
        try {
            String receiverId = (String) payload.get("receiverId");
            String requesterId = (String) payload.get("requesterId");

            log.info("Connection accepted between {} and {}. Backfilling feeds...", requesterId, receiverId);

            backfillRecentPosts(requesterId, receiverId);
            backfillRecentPosts(receiverId, requesterId);
        } catch (Exception e) {
            log.error("Error backfilling feed on connection.accepted: {}", e.getMessage());
        }
    }

    /**
     * Add a postId to a user's feed sorted set and enforce the max-size cap.
     *
     * ZADD is idempotent: re-adding the same postId just updates its score,
     * preventing duplicates if Kafka retries the same event.
     *
     * ZREMRANGEBYRANK trims the set from the low-score end (oldest posts)
     * keeping memory usage bounded at maxFeedSize entries per user.
     */
    private void pushToFeed(String userId, String postId, double score) {
        String feedKey = FEED_KEY_PREFIX + userId;

        // ZADD feed:<userId> <score> <postId>
        redisTemplate.opsForZSet().add(feedKey, postId, score);

        // Enforce cap: remove oldest entries beyond maxFeedSize
        Long total = redisTemplate.opsForZSet().zCard(feedKey);
        if (total != null && total > maxFeedSize) {
            // ZREMRANGEBYRANK feed:<userId> 0 <overflow_count - 1>
            redisTemplate.opsForZSet().removeRange(feedKey, 0, total - maxFeedSize - 1);
        }

        log.info("Post {} pushed to feed of user: {} (score={})", postId, userId, score);
    }

    /**
     * Backfill up to 10 recent posts from sourceAuthorId into targetUserFeedId's feed.
     * Triggered when two users first connect — seeds their feeds with each other's content.
     */
    private void backfillRecentPosts(String sourceAuthorId, String targetUserFeedId) {
        if (sourceAuthorId == null || targetUserFeedId == null) return;
        try {
            List<Map<String, Object>> posts = postServiceClient.getUserPosts(sourceAuthorId);
            if (posts != null && !posts.isEmpty()) {
                int limit = Math.min(posts.size(), 10);
                // Posts arrive newest-first; iterate oldest-to-newest so scores are ascending
                for (int i = limit - 1; i >= 0; i--) {
                    String postId = (String) posts.get(i).get("id");
                    if (postId != null) {
                        // Use millis offset to preserve relative ordering during backfill
                        double score = System.currentTimeMillis() - ((long) (limit - 1 - i) * 1000L);
                        pushToFeed(targetUserFeedId, postId, score);
                    }
                }
                log.info("Backfilled {} recent posts of user {} to feed of user {}",
                        limit, sourceAuthorId, targetUserFeedId);
            }
        } catch (Exception e) {
            log.warn("Failed to backfill posts of {} to {}: {}", sourceAuthorId, targetUserFeedId, e.getMessage());
        }
    }
}
