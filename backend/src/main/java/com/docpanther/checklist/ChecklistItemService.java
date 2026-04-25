package com.docpanther.checklist;

import com.docpanther.checklist.dto.ChecklistItemRequest;
import com.docpanther.checklist.dto.ChecklistItemResponse;
import com.docpanther.checklist.dto.ChecklistItemUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface ChecklistItemService {

    List<ChecklistItemResponse> getItems(UUID caseId);

    ChecklistItemResponse addItem(UUID caseId, ChecklistItemRequest request);

    ChecklistItemResponse updateItem(UUID caseId, UUID itemId, ChecklistItemUpdateRequest request);

    void deleteItem(UUID caseId, UUID itemId);
}
