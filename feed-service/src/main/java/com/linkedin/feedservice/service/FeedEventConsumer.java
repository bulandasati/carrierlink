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
     * Consume post.created event
     * When a user creates a post - immediately push that post
     * to All thier connections feed.
     *
     * This is how LinkedIn/ Twitter generated feed.
     * @param payload
     */
    @KafkaListener(topics = "post.created")
    public void consumePostCreated(
            @Payload Map<String, Object> payload){

        try{
            String postId = (String) payload.get("postId");
            String authorId = (String) payload.get("authorId");

            // Get all connections of the post author
            List<Map<String , Object>> connections =
                    userServiceClient.getConnections(authorId);

            // Push post to each connection's feed.
            for (Map<String, Object> connection : connections){
                String connectionId = (String) connection.get("id");
                String feedKey = FEED_KEY_PREFIX + connectionId;

                // Add post to feed (as sorted set - score = timestamp)
                redisTemplate.opsForList()
                        .leftPush(feedKey, postId);

                redisTemplate.opsForList()
                        .trim(feedKey, 0, maxFeedSize-1);

                log.info("Post {} pushed to feed of user: {}",
                        postId, connectionId);
            }

            String authorFeedKey = FEED_KEY_PREFIX + authorId;
            redisTemplate.opsForList()
                    .leftPush(authorFeedKey, postId);
            redisTemplate.opsForList()
                    .trim(authorFeedKey, 0, maxFeedSize - 1);

        }
        catch (Exception e){
            log.error("Error in pushing: {}", e.getMessage());
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

    private void backfillRecentPosts(String sourceAuthorId, String targetUserFeedId) {
        if (sourceAuthorId == null || targetUserFeedId == null) return;
        try {
            List<Map<String, Object>> posts = postServiceClient.getUserPosts(sourceAuthorId);
            if (posts != null && !posts.isEmpty()) {
                String feedKey = FEED_KEY_PREFIX + targetUserFeedId;
                // Take up to 10 recent posts
                int limit = Math.min(posts.size(), 10);
                for (int i = limit - 1; i >= 0; i--) {
                    String postId = (String) posts.get(i).get("id");
                    if (postId != null) {
                        redisTemplate.opsForList().leftPush(feedKey, postId);
                    }
                }
                redisTemplate.opsForList().trim(feedKey, 0, maxFeedSize - 1);
                log.info("Backfilled {} recent posts of user {} to feed of user {}", limit, sourceAuthorId, targetUserFeedId);
            }
        } catch (Exception e) {
            log.warn("Failed to backfill posts of {} to {}: {}", sourceAuthorId, targetUserFeedId, e.getMessage());
        }
    }













}
