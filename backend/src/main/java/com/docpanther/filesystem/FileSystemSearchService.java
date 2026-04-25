package com.docpanther.filesystem;

import com.docpanther.common.exception.ApiException;
import com.docpanther.filesystem.dto.CaseSummaryDto;
import com.docpanther.filesystem.dto.FileNodeResponse;
import com.docpanther.filesystem.dto.FolderResponse;
import com.docpanther.filesystem.dto.SearchResponse;
import com.docpanther.filesystem.model.FileNode;
import com.docpanther.filesystem.model.NodeType;
import com.docpanther.filesystem.repository.FileNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileSystemSearchService {

    private final FileNodeRepository  nodeRepository;
    private final FileSystemMapper    mapper;
    private final CaseQueryHelper     caseQueryHelper;
    private final JdbcTemplate        jdbcTemplate;

    @Transactional(readOnly = true)
    public SearchResponse search(UUID userId, UUID tenantId, String query) {
        UUID resolved = tenantId;
        if (resolved == null) {
            try {
                resolved = jdbcTemplate.queryForObject(
                    "SELECT tenant_id FROM users WHERE id = ? AND tenant_id IS NOT NULL",
                    UUID.class, userId);
            } catch (EmptyResultDataAccessException ignored) {}
        }
        if (resolved == null) {
            throw ApiException.badRequest("Search requires an organisation account");
        }
        if (query == null || query.isBlank()) {
            throw ApiException.badRequest("Search query must not be empty");
        }
        final UUID tid = resolved;

        List<FileNode> matchedFolders =
                nodeRepository.searchByName(tid, NodeType.FOLDER, query);
        List<FolderResponse> folderResponses = matchedFolders.stream()
                .map(f -> mapper.toFolderResponse(f, userId, tid))
                .toList();

        List<FileNode> matchedFiles =
                nodeRepository.searchByName(tid, NodeType.FILE, query);
        List<FileNodeResponse> fileResponses = matchedFiles.stream()
                .map(mapper::toFileNodeResponse)
                .toList();

        List<CaseSummaryDto> caseResults =
                caseQueryHelper.searchForTenant(tid, query);

        return new SearchResponse(folderResponses, caseResults, fileResponses);
    }
}
