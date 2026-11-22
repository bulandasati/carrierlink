package com.linkedin.postservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MultipartInitiateResponse {
    private String uploadId;
    private String key;
    private String fileUrl;
}
