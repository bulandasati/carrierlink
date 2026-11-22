package com.linkedin.userservice.controller;

import com.linkedin.userservice.dto.PresignedUrlResponse;
import com.linkedin.userservice.dto.UserResponse;
import com.linkedin.userservice.entity.Connection;
import com.linkedin.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.coyote.Response;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@Slf4j
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers(
            @RequestHeader(value = "X-User-Id", required = false) String requestingUserId) {
        return ResponseEntity.ok(userService.getAllUsers(requestingUserId));
    }

    /**
     * Get user Profile
     * X-user-Id = requesting user (from Gateway)
     * userId in path = target user to fetch
     * @return
     */

    @GetMapping("/{userId}")
    public ResponseEntity<UserResponse> getUserProfile(
            @PathVariable String userId,
            @RequestHeader(value = "X-User-Id", required = false) String requestingUserId){

        log.info("Get profile: {} requested by: {}",
                userId, requestingUserId);

        return ResponseEntity.ok(
                userService.getUserProfile(userId));
    }

    /**
     * Update own profile
     * user can only update their own profile
     * @param userId
     * @param requestingUserId
     * @return
     */
    @PutMapping("/{userId}/profile")
    public ResponseEntity<UserResponse> updateProfile(
            @PathVariable String userId,
            @RequestHeader("X-User-Id") String requestingUserId,
            @RequestBody UserResponse request){

        if(!userId.equals(requestingUserId)){
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(
                userService.updateProfile(userId, request));
    }

    @PostMapping("/{userId}/profile-photo")
    public ResponseEntity<UserResponse> uploadProfilePhoto(
            @PathVariable String userId,
            @RequestHeader("X-User-Id") String requestingUserId,
            @RequestParam("file")MultipartFile file){

        if(!userId.equals(requestingUserId)){
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(
                userService.uploadProfilePhoto(userId, file));

    }

    /**
     * Generate pre-signed URL for direct browser-to-S3 avatar upload
     */
    @GetMapping("/{userId}/avatar/presigned-url")
    public ResponseEntity<PresignedUrlResponse> getAvatarPresignedUrl(
            @PathVariable String userId,
            @RequestHeader("X-User-Id") String requestingUserId,
            @RequestParam(defaultValue = "avatar.jpg") String fileName,
            @RequestParam(defaultValue = "image/jpeg") String contentType) {

        if (!userId.equals(requestingUserId)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(
                userService.getAvatarPresignedUrl(userId, fileName, contentType));
    }

    /**
     * Confirm avatar upload after client directly uploads to S3
     */
    @PutMapping("/{userId}/avatar/confirm")
    public ResponseEntity<UserResponse> confirmAvatarUpload(
            @PathVariable String userId,
            @RequestHeader("X-User-Id") String requestingUserId,
            @RequestBody Map<String, String> request) {

        if (!userId.equals(requestingUserId)) {
            return ResponseEntity.status(403).build();
        }

        String photoUrl = request.get("photoUrl");
        if (photoUrl == null || photoUrl.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(
                userService.updateProfilePhotoUrl(userId, photoUrl));
    }

    /**
     * Send connection request
     * Requester Id comes from X-User-Id header - already validated
     * @param targetUserId
     * @param requestingUserId
     * @return
     */
    @PostMapping("/{targetUserId}/connect")
    public ResponseEntity<String> sendConnectionRequest(
            @PathVariable String targetUserId,
            @RequestHeader("X-User-Id") String requestingUserId){

        return ResponseEntity.ok(
                userService.sendConnectionRequest(
                        targetUserId, requestingUserId));
    }

    @PutMapping("/connection/{connectionId}/accept")
    public ResponseEntity<String> acceptConnection(
            @PathVariable String connectionId,
            @RequestHeader("X-User-Id") String requestingUserId){

        return ResponseEntity.ok(
                userService.acceptConnectionRequest(connectionId));
    }

    @GetMapping("/{userId}/connections/pending")
    public ResponseEntity<List<Connection>> getPendingConnections(
            @PathVariable String userId){

        return ResponseEntity.ok(
                userService.getPendingConnections(userId));
    }



    @GetMapping("/{userId}/connections")
    public ResponseEntity<List<UserResponse>> getConnections(
            @PathVariable String userId){
        return ResponseEntity.ok(
                userService.getConnections(userId));
    }

    @GetMapping("/{userId}/connection-status")
    public ResponseEntity<Map<String, Object>> getConnectionStatus(
            @PathVariable String userId,
            @RequestParam String currentUserId){
        return ResponseEntity.ok(
                userService.getConnectionStatus(userId, currentUserId));
    }
}
