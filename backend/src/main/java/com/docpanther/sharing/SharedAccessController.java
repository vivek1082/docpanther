package com.docpanther.sharing;

import com.docpanther.sharing.dto.AccessShareLinkRequest;
import com.docpanther.sharing.dto.PublicShareInfoResponse;
import com.docpanther.sharing.dto.ShareAccessResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shared")
@RequiredArgsConstructor
@PreAuthorize("permitAll()")
public class SharedAccessController {

    private final ShareService shareService;

    @GetMapping("/{token}")
    public ResponseEntity<PublicShareInfoResponse> getInfo(@PathVariable String token) {
        return ResponseEntity.ok(shareService.getPublicInfo(token));
    }

    @PostMapping("/{token}/access")
    public ResponseEntity<ShareAccessResponse> access(
            @PathVariable String token,
            @RequestBody(required = false) AccessShareLinkRequest req) {

        return ResponseEntity.ok(shareService.access(token, req));
    }
}
