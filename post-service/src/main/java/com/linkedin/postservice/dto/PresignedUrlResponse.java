package com.linkedin.postservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PresignedUrlResponse {
    private String uploadUrl;
    private String fileUrl;
    private String key;
}
