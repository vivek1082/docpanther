package com.docpanther.checklist;

import com.docpanther.checklist.dto.ChecklistItemRequest;
import com.docpanther.checklist.dto.ChecklistItemResponse;
import com.docpanther.checklist.dto.ChecklistItemUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cases/{caseId}/items")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ChecklistController {

    private final ChecklistItemService checklistItemService;

    @GetMapping
    public List<ChecklistItemResponse> listItems(@PathVariable UUID caseId) {
        return checklistItemService.getItems(caseId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChecklistItemResponse addItem(
            @PathVariable UUID caseId,
            @Valid @RequestBody ChecklistItemRequest request) {
        return checklistItemService.addItem(caseId, request);
    }

    @PutMapping("/{itemId}")
    public ChecklistItemResponse updateItem(
            @PathVariable UUID caseId,
            @PathVariable UUID itemId,
            @Valid @RequestBody ChecklistItemUpdateRequest request) {
        return checklistItemService.updateItem(caseId, itemId, request);
    }

    @DeleteMapping("/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(
            @PathVariable UUID caseId,
            @PathVariable UUID itemId) {
        checklistItemService.deleteItem(caseId, itemId);
    }
}
