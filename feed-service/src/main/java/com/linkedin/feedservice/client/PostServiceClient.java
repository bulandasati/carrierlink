package com.linkedin.feedservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.Map;

@FeignClient(name = "post-service", url = "${post.service.url:http://localhost:8082}")
public interface PostServiceClient {

    @GetMapping("/api/v1/posts/user/{userId}")
    List<Map<String, Object>> getUserPosts(@PathVariable("userId") String userId);
}
