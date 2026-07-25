package org.example.marketplace.exception;

import feign.FeignException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.example.DTO.Common.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.stream.Collectors;

/**
 * HOTFIX: marketplace-service là service DUY NHẤT trong hệ thống chưa có
 * @RestControllerAdvice. Mọi RuntimeException nghiệp vụ (Product/Order/Cart not found,
 * Forbidden, Cart is empty...) hiện đang rơi ra whitelabel error mặc định của Spring Boot
 * dưới dạng 500 -> khiến FE không parse được JSON.
 *
 * File này khôi phục lại đúng ý đồ ban đầu của dev: dùng ApiResponse.error() đã có sẵn
 * (trước đây được viết ra nhưng 0 nơi nào gọi tới).
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // ---- 1) Validate request body (@Valid) ----
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex,
                                                                HttpServletRequest req) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        log.warn("Validation failed [{}]: {}", req.getRequestURI(), msg);
        return ResponseEntity.badRequest().body(ApiResponse.error(400, msg));
    }

    // ---- 2) Quyền truy cập ----
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex,
                                                                  HttpServletRequest req) {
        log.warn("Access denied [{}]", req.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(403, "Bạn không có quyền thực hiện thao tác này"));
    }

    // ---- 3) Bóc tách lỗi từ Feign (farm/season/inventory/identity-service) ----
    // Đây là phần trả lời trực tiếp cho câu hỏi "Hiệu ứng Domino OpenFeign":
    // KHÔNG cào bằng FeignException thành 500 nữa.
    @ExceptionHandler(FeignException.class)
    public ResponseEntity<ApiResponse<Void>> handleFeignException(FeignException ex,
                                                                     HttpServletRequest req) {
        int upstreamStatus = ex.status();
        log.error("Upstream call failed [{} -> {}], status={}, body={}",
                req.getRequestURI(), ex.getMessage(), upstreamStatus, ex.contentUTF8());

        HttpStatus resolved = HttpStatus.resolve(upstreamStatus);
        if (resolved == null || resolved.is5xxServerError()) {
            // Service con thực sự sập -> 502 Bad Gateway, KHÔNG phải lỗi của marketplace-service
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(ApiResponse.error(502, "Dịch vụ phụ thuộc đang gặp sự cố, vui lòng thử lại sau"));
        }
        // Feign trả 400/404 thật sự -> giữ nguyên ý nghĩa đó cho FE, không đổi thành 500
        return ResponseEntity.status(resolved)
                .body(ApiResponse.error(upstreamStatus, "Yêu cầu tới dịch vụ liên quan không hợp lệ"));
    }

    // ---- 4) Lỗi input rõ ràng (thiếu header, sai định dạng...) ----
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex,
                                                                      HttpServletRequest req) {
        log.warn("Bad request [{}]: {}", req.getRequestURI(), ex.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error(400, ex.getMessage()));
    }

    // ---- 4.1) Custom Exceptions ----
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFoundException(ResourceNotFoundException ex, HttpServletRequest req) {
        log.warn("Resource not found [{}]: {}", req.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(404, ex.getMessage()));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequestException(BadRequestException ex, HttpServletRequest req) {
        log.warn("Bad request exception [{}]: {}", req.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(400, ex.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiResponse<Void>> handleForbiddenException(ForbiddenException ex, HttpServletRequest req) {
        log.warn("Forbidden exception [{}]: {}", req.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(403, ex.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiResponse<Void>> handleConflictException(ConflictException ex, HttpServletRequest req) {
        log.warn("Conflict exception [{}]: {}", req.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(409, ex.getMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxSizeException(MaxUploadSizeExceededException ex, HttpServletRequest req) {
        log.warn("Payload too large [{}]: {}", req.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiResponse.error(413, "File upload failed: The selected file exceeds the 10MB limit."));
    }

    // ---- 5) Lưới an toàn cuối cùng: mọi Exception khác đều thành JSON có cấu trúc ----
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex, HttpServletRequest req) {
        log.error("Unhandled exception on {}", req.getRequestURI(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(500, "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"));
    }
}
