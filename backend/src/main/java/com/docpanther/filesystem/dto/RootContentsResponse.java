package com.docpanther.filesystem.dto;

import java.util.List;

public record RootContentsResponse(
        List<FolderResponse>  folders,
        List<CaseSummaryDto>  cases,
        List<FileNodeResponse> files
) {}
