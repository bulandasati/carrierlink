package com.linkedin.feedservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@Slf4j
@RequiredArgsConstructor
public class FeedService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String FEED_KEY_PREFIX = "feed:";

    /**
     * Retrieve a paginated slice of a user's feed.
     *
     * Uses ZREVRANGE so posts are returned newest-first (highest score = most recent).
     * Pagination is index-based: page 0 → [0, size-1], page 1 → [size, 2*size-1], etc.
     *
     * Redis command: ZREVRANGE feed:<userId> <start> <end>
     *
     * @param userId the authenticated user's ID (injected by Gateway via X-User-Id header)
     * @param page   zero-based page index
     * @param size   number of posts per page
     * @return list of postIds ordered newest-first
     */
    public List<String> getFeed(String userId, int page, int size) {

        log.info("Getting feed for user: {}", userId);

        String feedKey = FEED_KEY_PREFIX + userId;

        // Calculate inclusive index bounds for this page
        long start = (long) page * size;
        long end = start + size - 1;

        // ZREVRANGE: fetch postIds in descending score order (newest first)
        Set<Object> postIds = redisTemplate.opsForZSet()
                .reverseRange(feedKey, start, end);

        if (postIds == null || postIds.isEmpty()) {
            log.info("Feed cache empty for user: {}", userId);
            return new ArrayList<>();
        }

        List<String> result = postIds.stream()
                .map(Object::toString)
                .toList();

        log.info("Returning {} posts for user: {}", result.size(), userId);

        return result;
    }

    /**
     * Clear feed cache for a user.
     * Called when the user's connection graph changes significantly.
     *
     * Redis command: DEL feed:<userId>
     *
     * @param userId the user whose feed cache should be invalidated
     */
    public void clearFeed(String userId) {
        String feedKey = FEED_KEY_PREFIX + userId;
        redisTemplate.delete(feedKey);
        log.info("Feed cache cleared for user: {}", userId);
    }
}
