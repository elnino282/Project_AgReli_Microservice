package org.example.ai.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import feign.FeignException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorResponse> handleAppException(AppException ex, HttpServletRequest request) {
        log.warn("AppException on request: {} - code: {} - message: {}",
                request.getRequestURI(), ex.getErrorCode().getCode(), ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(ex.getErrorCode().getStatusCode().value())
                .error(ex.getErrorCode().getCode())
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(ex.getErrorCode().getStatusCode()).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String validationErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        log.warn("Validation error on request: {} - errors: {}", request.getRequestURI(), validationErrors);

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Validation Failed")
                .message(validationErrors)
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex, HttpServletRequest request) {
        log.warn("Access denied on request: {}", request.getRequestURI());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.FORBIDDEN.value())
                .error("Forbidden")
                .message("You do not have permission to access this resource.")
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalStateException(IllegalStateException ex, HttpServletRequest request) {
        log.warn("Illegal state on request: {} - message: {}", request.getRequestURI(), ex.getMessage());

        boolean aiDisabled = ex.getMessage() != null && ex.getMessage().toLowerCase().contains("disabled");
        HttpStatus status = aiDisabled ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.INTERNAL_SERVER_ERROR;

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(aiDisabled
                        ? "Dịch vụ AI hiện chưa được cấu hình (thiếu API key). Vui lòng liên hệ quản trị viên."
                        : "Dịch vụ AI gặp sự cố khi xử lý yêu cầu.")
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(status).body(errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on request: {}", request.getRequestURI(), ex);

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Internal Server Error")
                .message("An unexpected error occurred. Please try again later.")
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<ErrorResponse> handleFeignException(FeignException ex, HttpServletRequest request) {
        int upstreamStatus = ex.status();
        log.error("Upstream call failed [{}], status={}, body={}",
                request.getRequestURI(), upstreamStatus, ex.contentUTF8());

        HttpStatus resolved = HttpStatus.resolve(upstreamStatus);
        HttpStatus finalStatus = (resolved == null || resolved.is5xxServerError())
                ? HttpStatus.BAD_GATEWAY   // service con thực sự sập -> 502, không phải lỗi của service này
                : resolved;                // 4xx thật -> giữ nguyên cho FE

        return ResponseEntity.status(finalStatus).body(
            ErrorResponse.builder()
                .status(finalStatus.value())
                .error(finalStatus.getReasonPhrase())
                .message("Dịch vụ phụ thuộc phản hồi lỗi, vui lòng thử lại sau")
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build());
    }
}
