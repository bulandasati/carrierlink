package com.linkedin.postservice.service;

import com.linkedin.postservice.dto.MultipartCompleteRequest;
import com.linkedin.postservice.dto.MultipartInitiateResponse;
import com.linkedin.postservice.dto.MultipartPartPresignedResponse;
import com.linkedin.postservice.dto.PresignedUrlResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedUploadPartRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.UploadPartPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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
     * Standard synchronous upload via Spring Boot backend (retained for backward compatibility).
     */
    public String uploadFile(MultipartFile file, String keyPrefix) {
        try {
            String key = keyPrefix + "/" + UUID.randomUUID() + "_" + file.getOriginalFilename();

            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));

            String url = "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + key;
            log.info("File uploaded to S3: {}", url);
            return url;
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to S3: " + e.getMessage());
        }
    }

    /**
     * 1. Pre-signed PUT URL for single-part uploads (images, attachments < 5MB).
     * Eliminates backend file proxying; browser uploads directly to S3.
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

        log.info("Generated single-part presigned upload URL for key: {}", key);
        return new PresignedUrlResponse(uploadUrl, fileUrl, key);
    }

    /**
     * 2. S3 Multipart Upload: Step 1 - Initiate
     * Calls S3 CreateMultipartUpload and returns uploadId.
     */
    public MultipartInitiateResponse initiateMultipartUpload(String keyPrefix, String fileName, String contentType) {
        String extension = "";
        if (fileName != null && fileName.contains(".")) {
            extension = fileName.substring(fileName.lastIndexOf("."));
        }
        String key = keyPrefix + "/" + UUID.randomUUID() + extension;

        CreateMultipartUploadRequest createRequest = CreateMultipartUploadRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType != null && !contentType.isBlank() ? contentType : "application/octet-stream")
                .build();

        CreateMultipartUploadResponse response = s3Client.createMultipartUpload(createRequest);
        String fileUrl = "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + key;

        log.info("Initiated S3 Multipart Upload: key={}, uploadId={}", key, response.uploadId());
        return new MultipartInitiateResponse(response.uploadId(), key, fileUrl);
    }

    /**
     * 2. S3 Multipart Upload: Step 2 - Generate Pre-signed URL for a specific chunk/part.
     */
    public MultipartPartPresignedResponse generatePresignedPartUploadUrl(String key, String uploadId, int partNumber) {
        UploadPartRequest uploadPartRequest = UploadPartRequest.builder()
                .bucket(bucketName)
                .key(key)
                .uploadId(uploadId)
                .partNumber(partNumber)
                .build();

        UploadPartPresignRequest presignRequest = UploadPartPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .uploadPartRequest(uploadPartRequest)
                .build();

        PresignedUploadPartRequest presignedUploadPart = s3Presigner.presignUploadPart(presignRequest);
        log.info("Generated presigned URL for part {} of uploadId {}", partNumber, uploadId);

        return new MultipartPartPresignedResponse(presignedUploadPart.url().toString(), partNumber);
    }

    /**
     * 2. S3 Multipart Upload: Step 3 - Complete Multipart Upload
     * Stitches together uploaded parts using their part numbers and ETags.
     */
    public String completeMultipartUpload(String key, String uploadId, List<MultipartCompleteRequest.PartInfo> parts) {
        if (parts == null || parts.isEmpty()) {
            throw new IllegalArgumentException("Parts list cannot be empty for multipart upload completion");
        }

        // S3 requires parts to be strictly sorted by partNumber ascending
        List<CompletedPart> completedParts = parts.stream()
                .sorted(Comparator.comparingInt(MultipartCompleteRequest.PartInfo::getPartNumber))
                .map(p -> CompletedPart.builder()
                        .partNumber(p.getPartNumber())
                        .eTag(p.getETag())
                        .build())
                .collect(Collectors.toList());

        CompleteMultipartUploadRequest completeRequest = CompleteMultipartUploadRequest.builder()
                .bucket(bucketName)
                .key(key)
                .uploadId(uploadId)
                .multipartUpload(CompletedMultipartUpload.builder().parts(completedParts).build())
                .build();

        s3Client.completeMultipartUpload(completeRequest);

        String fileUrl = "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + key;
        log.info("Completed S3 Multipart Upload: key={}, uploadId={}, url={}", key, uploadId, fileUrl);
        return fileUrl;
    }

    /**
     * 2. S3 Multipart Upload: Abort upload and free stored parts if upload fails or is cancelled.
     */
    public void abortMultipartUpload(String key, String uploadId) {
        AbortMultipartUploadRequest abortRequest = AbortMultipartUploadRequest.builder()
                .bucket(bucketName)
                .key(key)
                .uploadId(uploadId)
                .build();

        s3Client.abortMultipartUpload(abortRequest);
        log.info("Aborted S3 Multipart Upload: key={}, uploadId={}", key, uploadId);
    }
}
