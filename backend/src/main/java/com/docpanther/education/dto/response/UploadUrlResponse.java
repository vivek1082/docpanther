package com.docpanther.education.dto.response;

public record UploadUrlResponse(
        String uploadUrl,
        String confirmToken,
        String key
) {}
