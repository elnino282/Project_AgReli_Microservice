package org.example.adminreporting.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.example.adminreporting.dto.ApiResponse;
import org.example.adminreporting.dto.PageResponse;
import org.example.adminreporting.dto.response.AdminDocumentResponse;
import org.example.adminreporting.config.CurrentUserService;
import org.example.adminreporting.service.AdminDocumentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class AdminDocumentController {

    private final AdminDocumentService adminDocumentService;
    private final CurrentUserService currentUserService;

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC ENDPOINTS (Farmer/Buyer Access)
    // ═══════════════════════════════════════════════════════════════

    /**
     * List documents visible to all farmers/buyers
     * GET /api/v1/documents
     */
    @GetMapping("/api/v1/documents")
    @PreAuthorize("hasAnyRole('FARMER', 'BUYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<AdminDocumentResponse>>> listPublicDocuments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "all") String tab,
            @RequestParam(required = false) String crop,
            @RequestParam(required = false) String stage,
            @RequestParam(required = false) String topic,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        PageResponse<AdminDocumentResponse> response = adminDocumentService.listPublicDocuments(
                currentUserService.getCurrentUserId(), page, size, tab, q, type, crop, stage, topic, sort);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Get document meta (filter options)
     * GET /api/v1/documents/meta
     */
    @GetMapping("/api/v1/documents/meta")
    @PreAuthorize("hasAnyRole('FARMER', 'BUYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<org.example.adminreporting.dto.response.DocumentMetaResponse>> getDocumentsMeta() {
        return ResponseEntity.ok(ApiResponse.success(adminDocumentService.getDocumentMeta()));
    }

    /**
     * Get single document by ID (public access)
     * GET /api/v1/documents/{id}
     */
    @GetMapping("/api/v1/documents/{id}")
    @PreAuthorize("hasAnyRole('FARMER', 'BUYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<AdminDocumentResponse>> getPublicDocument(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                adminDocumentService.getPublicDocumentById(id, currentUserService.getCurrentUserId())));
    }

    /**
     * Record document open (for Recent tab)
     * POST /api/v1/documents/{id}/open
     */
    @PostMapping("/api/v1/documents/{id}/open")
    @PreAuthorize("hasAnyRole('FARMER', 'BUYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> recordDocumentOpen(@PathVariable Integer id) {
        adminDocumentService.recordDocumentOpen(id, currentUserService.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * Add document to favorites
     * POST /api/v1/documents/{id}/favorite
     */
    @PostMapping("/api/v1/documents/{id}/favorite")
    @PreAuthorize("hasAnyRole('FARMER', 'BUYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> addToFavorite(@PathVariable Integer id) {
        adminDocumentService.addFavorite(id, currentUserService.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * Remove document from favorites
     * DELETE /api/v1/documents/{id}/favorite
     */
    @DeleteMapping("/api/v1/documents/{id}/favorite")
    @PreAuthorize("hasAnyRole('FARMER', 'BUYER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeFromFavorite(@PathVariable Integer id) {
        adminDocumentService.removeFavorite(id, currentUserService.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN ENDPOINTS (Admin Only)
    // ═══════════════════════════════════════════════════════════════

    @GetMapping("/api/v1/admin/documents")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<AdminDocumentResponse>>> listAdminDocuments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        PageResponse<AdminDocumentResponse> response = adminDocumentService.listDocuments(page, size, q, type, status, sort);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/api/v1/admin/documents/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminDocumentResponse>> getDocumentById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(adminDocumentService.getDocumentById(id)));
    }

    @PostMapping("/api/v1/admin/documents")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminDocumentResponse>> createDocument(
            @Valid @RequestBody CreateDocumentRequest request) {
        AdminDocumentResponse response = adminDocumentService.createDocument(
                request.title(),
                request.description(),
                request.documentUrl(),
                request.documentType(),
                request.status());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/api/v1/admin/documents/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminDocumentResponse>> updateDocument(
            @PathVariable Integer id,
            @Valid @RequestBody CreateDocumentRequest request) {
        AdminDocumentResponse response = adminDocumentService.updateDocument(
                id,
                request.title(),
                request.description(),
                request.documentUrl(),
                request.documentType(),
                request.status());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/api/v1/admin/documents/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> softDeleteDocument(@PathVariable Integer id) {
        adminDocumentService.softDeleteDocument(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/api/v1/admin/documents/{id}/permanent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> hardDeleteDocument(@PathVariable Integer id) {
        adminDocumentService.hardDeleteDocument(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    public record CreateDocumentRequest(
            @NotBlank(message = "Title is required") String title,
            String description,
            String documentUrl,
            String documentType,
            String status) {
    }
}
