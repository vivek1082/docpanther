package com.docpanther.education.dto.response;

public record MaterialUploadResponse(
        MaterialResponse material,
        String uploadUrl
) {}
