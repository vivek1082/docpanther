package com.docpanther.filesystem;

import com.docpanther.filesystem.dto.FileNodeResponse;
import com.docpanther.filesystem.dto.FolderResponse;
import com.docpanther.filesystem.model.FileNode;
import com.docpanther.filesystem.model.NodeType;
import com.docpanther.filesystem.model.PermissionRole;
import com.docpanther.filesystem.repository.FileNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class FileSystemMapper {

    private final FileNodeRepository nodeRepository;
    private final FileSystemPermissionService permissionService;

    public FolderResponse toFolderResponse(FileNode node, UUID userId, UUID tenantId) {
        PermissionRole role = permissionService.getEffectiveRole(userId, tenantId, node.getId());
        String apiPermission = role != null ? role.toApiRole() : "VIEW";

        long childCount = nodeRepository.countByParentIdAndType(node.getId(), NodeType.FOLDER);
        long fileCount  = nodeRepository.countByParentIdAndType(node.getId(), NodeType.FILE);

        return new FolderResponse(
                node.getId(),
                node.getParentId(),
                node.getName(),
                node.getCreatedBy(),
                apiPermission,
                childCount,
                0L,        // cases have no folder_id in the DB schema
                fileCount,
                node.getCreatedAt()
        );
    }

    public FileNodeResponse toFileNodeResponse(FileNode file) {
        return new FileNodeResponse(
                file.getId(),
                file.getParentId(),
                file.getName(),
                file.getMimeType(),
                file.getSizeBytes() != null ? file.getSizeBytes() : 0L,
                file.getCreatedBy(),
                file.getCreatedAt()
        );
    }
}
