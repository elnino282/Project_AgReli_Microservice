package org.example.farm.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION("ERR_UNCATEGORIZED_EXCEPTION", "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    KEY_INVALID("ERR_KEY_INVALID", "Invalid key", HttpStatus.BAD_REQUEST),
    INTERNAL_SERVER_ERROR("ERR_INTERNAL_SERVER_ERROR", "Internal server error", HttpStatus.INTERNAL_SERVER_ERROR),
    BAD_REQUEST("ERR_BAD_REQUEST", "Bad request", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED("ERR_UNAUTHORIZED", "Unauthorized", HttpStatus.UNAUTHORIZED),
    FORBIDDEN("ERR_FORBIDDEN", "Forbidden", HttpStatus.FORBIDDEN),
    RESOURCE_NOT_FOUND("ERR_RESOURCE_NOT_FOUND", "Resource not found", HttpStatus.NOT_FOUND),
    DUPLICATE_RESOURCE("ERR_DUPLICATE_RESOURCE", "Resource already exists", HttpStatus.CONFLICT),
    UNAUTHENTICATED("ERR_UNAUTHENTICATED", "Unauthenticated", HttpStatus.UNAUTHORIZED),
    USER_NOT_FOUND("ERR_USER_NOT_FOUND", "User not found", HttpStatus.NOT_FOUND),

    PLOT_NOT_FOUND("ERR_PLOT_NOT_FOUND", "Plot not found", HttpStatus.NOT_FOUND),
    PLOT_NAME_EXISTS("ERR_PLOT_NAME_EXISTS", "Plot name already exists", HttpStatus.CONFLICT),
    INVALID_PLOT_AREA("ERR_INVALID_PLOT_AREA", "Plot area must be greater than 0", HttpStatus.BAD_REQUEST),
    PLOT_STATUS_NOT_FOUND("ERR_PLOT_STATUS_NOT_FOUND", "Plot status not found", HttpStatus.NOT_FOUND),
    PLOT_HAS_ACTIVE_SEASONS("ERR_PLOT_HAS_ACTIVE_SEASONS", "Cannot delete plot because it has active or planned seasons", HttpStatus.BAD_REQUEST),
    PLOT_HAS_ACTIVE_TASKS("ERR_PLOT_HAS_ACTIVE_TASKS", "Cannot delete plot because it has pending, in-progress or overdue tasks", HttpStatus.BAD_REQUEST),
    PLOT_DEPENDENCY_UNAVAILABLE("ERR_PLOT_DEPENDENCY_UNAVAILABLE", "Cannot verify plot dependencies because season service is unavailable", HttpStatus.SERVICE_UNAVAILABLE),

    FARM_NOT_FOUND("ERR_FARM_NOT_FOUND", "Farm not found", HttpStatus.NOT_FOUND),
    FARM_NAME_EXISTS("ERR_FARM_NAME_EXISTS", "Farm name already exists", HttpStatus.CONFLICT),
    FARM_HAS_CHILD_RECORDS("ERR_FARM_HAS_CHILD_RECORDS", "Cannot delete farm with related plots or seasons", HttpStatus.BAD_REQUEST),
    FARM_ALREADY_INACTIVE("ERR_FARM_ALREADY_INACTIVE", "Farm is already inactive", HttpStatus.BAD_REQUEST),
    FARM_ALREADY_ACTIVE("ERR_FARM_ALREADY_ACTIVE", "Farm is already active", HttpStatus.BAD_REQUEST),
    FARM_INACTIVE("ERR_FARM_INACTIVE", "Farm must be active to create plots or seasons", HttpStatus.BAD_REQUEST),

    PROVINCE_NOT_FOUND("ERR_PROVINCE_NOT_FOUND", "Province not found", HttpStatus.NOT_FOUND),
    PROVINCE_REQUIRED("ERR_PROVINCE_REQUIRED", "Province is required when creating a farm", HttpStatus.BAD_REQUEST),
    WARD_NOT_FOUND("ERR_WARD_NOT_FOUND", "Ward not found", HttpStatus.NOT_FOUND),
    WARD_REQUIRED("ERR_WARD_REQUIRED", "Ward is required when creating a farm", HttpStatus.BAD_REQUEST),
    WARD_NOT_IN_PROVINCE("ERR_WARD_NOT_IN_PROVINCE", "Ward does not belong to the specified province", HttpStatus.BAD_REQUEST),
    ADDRESS_IMPORT_FAILED("ERR_ADDRESS_IMPORT_FAILED", "Failed to import address data", HttpStatus.INTERNAL_SERVER_ERROR),

    // Certification audit workflow errors
    CERTIFICATION_NOT_FOUND("ERR_CERTIFICATION_NOT_FOUND", "Certification record not found", HttpStatus.NOT_FOUND),
    CERTIFICATION_EVIDENCE_UNAVAILABLE("ERR_CERTIFICATION_EVIDENCE_UNAVAILABLE", "Certification evidence cannot be verified because a downstream service is unavailable", HttpStatus.SERVICE_UNAVAILABLE),
    CERTIFICATION_INVALID_TRANSITION("ERR_CERTIFICATION_INVALID_TRANSITION", "Invalid certification status transition", HttpStatus.BAD_REQUEST),
    AUDIT_NOT_FOUND("ERR_AUDIT_NOT_FOUND", "Certification audit not found", HttpStatus.NOT_FOUND),
    NONCONFORMITY_NOT_FOUND("ERR_NONCONFORMITY_NOT_FOUND", "Nonconformity not found", HttpStatus.NOT_FOUND),
    CORRECTIVE_ACTION_NOT_FOUND("ERR_CORRECTIVE_ACTION_NOT_FOUND", "Corrective action not found", HttpStatus.NOT_FOUND),
    CRITICAL_NONCONFORMITY_OPEN("ERR_CRITICAL_NONCONFORMITY_OPEN", "Cannot issue certificate while critical nonconformity is open", HttpStatus.CONFLICT),
    DOCUMENT_NOT_FOUND("ERR_DOCUMENT_NOT_FOUND", "Farm document not found", HttpStatus.NOT_FOUND);

    ErrorCode(String code, String message, HttpStatus statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final String code;
    private final String message;
    private final HttpStatus statusCode;
}
