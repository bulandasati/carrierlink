package com.linkedin.notificationservice.client;

import com.linkedin.notificationservice.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service", url = "${user-service.url:http://localhost:8081}")
public interface UserClient {

    @GetMapping("/api/v1/users/{userId}")
    UserDto getUserById(@PathVariable("userId") String userId);
}
