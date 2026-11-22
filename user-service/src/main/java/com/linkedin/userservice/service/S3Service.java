package com.linkedin.userservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

import com.linkedin.userservice.dto.PresignedUrlResponse;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;

@Service
@Slf4j
@RequiredArgsConstructor
public class S3Service {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.region}")
    private String region;

    /**
     * Generate Pre-signed PUT URL for direct client-to-S3 upload.
     * Prevents binary data from traversing the backend microservice.
     */
    public PresignedUrlResponse generatePresignedUploadUrl(String keyPrefix, String fileName, String contentType) {
        String extension = "";
        if (fileName != null && fileName.contains(".")) {
            extension = fileName.substring(fileName.lastIndexOf("."));
        }
        String key = keyPrefix + "/" + UUID.randomUUID() + extension;

        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType != null && !contentType.isBlank() ? contentType : "application/octet-stream")
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(objectRequest)
                .build();

        PresignedPutObjectRequest presignedPutObjectRequest = s3Presigner.presignPutObject(presignRequest);
        String uploadUrl = presignedPutObjectRequest.url().toString();
        String fileUrl = "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + key;

        log.info("Generated presigned upload URL for key: {}", key);
        return new PresignedUrlResponse(uploadUrl, fileUrl, key);
    }

    /**
     * Upload file to S3.
     * Returns public URL of uploaded file.
     */
    public String uploadFile(MultipartFile file, String keyPrefix) {
        try {
            String key = keyPrefix + "/" +
                    UUID.randomUUID() + "_" + file.getOriginalFilename();

            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(request,
                    RequestBody.fromBytes(file.getBytes()));

            String url = "https://" + bucketName
                    + ".s3." + region
                    + ".amazonaws.com/" + key;

            log.info("File uploaded to S3: {}", url);
            return url;

        } catch (IOException e) {
            throw new RuntimeException(
                    "Failed to upload file to S3: " + e.getMessage());
        }
    }
}
