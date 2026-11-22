package com.linkedin.postservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MultipartCompleteRequest {
    private String key;
    private String uploadId;
    private List<PartInfo> parts;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PartInfo {
        private Integer partNumber;
        private String eTag;
    }
}
