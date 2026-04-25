package com.docpanther.filesystem.dto;

import java.util.List;

public record FolderContentsResponse(
        FolderResponse        folder,
        List<FolderResponse>  folders,
        List<CaseSummaryDto>  cases,
        List<FileNodeResponse> files
) {}
