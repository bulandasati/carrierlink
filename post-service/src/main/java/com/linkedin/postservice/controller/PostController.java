package com.linkedin.postservice.controller;

import com.linkedin.postservice.dto.MultipartCompleteRequest;
import com.linkedin.postservice.dto.MultipartInitiateResponse;
import com.linkedin.postservice.dto.MultipartPartPresignedResponse;
import com.linkedin.postservice.dto.PresignedUrlResponse;
import com.linkedin.postservice.entity.Comment;
import com.linkedin.postservice.entity.Post;
import com.linkedin.postservice.service.PostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/posts")
@Slf4j
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    // Create post - supports both legacy MultipartFile or direct pre-signed S3 imageUrl
    @PostMapping
    public ResponseEntity<Post> createPost(
            @RequestParam String authorId,
            @RequestParam String content,
            @RequestParam(required = false) String imageUrl,
            @RequestParam(required = false) MultipartFile image){

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(postService.createPost(authorId, content, imageUrl, image));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<Post> getPost(
            @PathVariable String postId,
            @RequestParam(required = false) String userId){

        return ResponseEntity.ok(postService.getPost(postId, userId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Post>> getUserPosts(
            @PathVariable String userId,
            @RequestParam(required = false) String currentUserId){

        return ResponseEntity.ok(postService.getUserPosts(userId, currentUserId));
    }

    @PostMapping("/{postId}/like")
    public ResponseEntity<Map<String, Object>> likePost(
            @PathVariable String postId,
            @RequestParam String userId){

        return ResponseEntity.ok(postService.likePost(postId, userId));
    }

    @GetMapping("/{postId}/liked")
    public ResponseEntity<Boolean> isPostLiked(
            @PathVariable String postId,
            @RequestParam String userId){

        return ResponseEntity.ok(postService.isPostLiked(postId, userId));
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<Comment> addComment(
            @PathVariable String postId,
            @RequestParam String authorId,
            @RequestParam String content){

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(postService.addComment(postId, authorId, content));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<String> deletePost(
            @PathVariable String postId,
            @RequestParam String userId){

        postService.deletePost(postId, userId);

        return ResponseEntity.ok("Post deleted");
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<List<Comment>> getComments(
            @PathVariable String postId){

        return ResponseEntity.ok(postService.getComments(postId));
    }

    /**
     * 1. Pre-signed PUT URL for single-part post media (< 5MB)
     */
    @PostMapping("/upload/presigned-url")
    public ResponseEntity<PresignedUrlResponse> getPresignedUploadUrl(
            @RequestHeader(value = "X-User-Id", required = false) String requestingUserId,
            @RequestParam(required = false) String authorId,
            @RequestParam(defaultValue = "attachment.jpg") String fileName,
            @RequestParam(defaultValue = "image/jpeg") String contentType) {

        String user = (requestingUserId != null && !requestingUserId.isBlank()) ? requestingUserId : authorId;
        if (user == null || user.isBlank()) {
            user = "anonymous";
        }
        return ResponseEntity.ok(postService.generatePresignedUploadUrl(user, fileName, contentType));
    }

    /**
     * 2. S3 Multipart Upload: Step 1 - Initiate
     */
    @PostMapping("/upload/multipart/initiate")
    public ResponseEntity<MultipartInitiateResponse> initiateMultipartUpload(
            @RequestHeader(value = "X-User-Id", required = false) String requestingUserId,
            @RequestParam(required = false) String authorId,
            @RequestParam String fileName,
            @RequestParam(defaultValue = "application/octet-stream") String contentType) {

        String user = (requestingUserId != null && !requestingUserId.isBlank()) ? requestingUserId : authorId;
        if (user == null || user.isBlank()) {
            user = "anonymous";
        }
        return ResponseEntity.ok(postService.initiateMultipartUpload(user, fileName, contentType));
    }

    /**
     * 2. S3 Multipart Upload: Step 2 - Generate presigned URL for each part
     */
    @PostMapping("/upload/multipart/presigned-part")
    public ResponseEntity<MultipartPartPresignedResponse> getPresignedPartUploadUrl(
            @RequestParam String key,
            @RequestParam String uploadId,
            @RequestParam int partNumber) {

        return ResponseEntity.ok(postService.generatePresignedPartUploadUrl(key, uploadId, partNumber));
    }

    /**
     * 2. S3 Multipart Upload: Step 3 - Complete multipart upload
     */
    @PostMapping("/upload/multipart/complete")
    public ResponseEntity<Map<String, String>> completeMultipartUpload(
            @RequestBody MultipartCompleteRequest request) {

        String fileUrl = postService.completeMultipartUpload(request.getKey(), request.getUploadId(), request.getParts());
        return ResponseEntity.ok(Map.of("fileUrl", fileUrl, "key", request.getKey()));
    }

    /**
     * 2. S3 Multipart Upload: Abort upload
     */
    @PostMapping("/upload/multipart/abort")
    public ResponseEntity<Map<String, String>> abortMultipartUpload(
            @RequestParam String key,
            @RequestParam String uploadId) {

        postService.abortMultipartUpload(key, uploadId);
        return ResponseEntity.ok(Map.of("message", "Multipart upload aborted successfully"));
    }
}
