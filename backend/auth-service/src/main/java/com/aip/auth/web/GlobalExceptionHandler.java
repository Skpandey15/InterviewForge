package com.aip.auth.web;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.stream.Collectors;

/**
 * Single error contract for the whole service. Every failure — an intentional
 * {@link ResponseStatusException}, a bean-validation failure, a framework error,
 * or an unexpected bug — returns the same {@link ApiError} JSON shape and carries
 * the current traceId for correlation with logs/Jaeger. Unexpected errors are
 * logged at ERROR with the stack trace; the response body never leaks internals.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Consistent error body returned for every failure. */
    public record ApiError(String timestamp, int status, String error, String message,
                           String path, String traceId) {
    }

    /** Validation failures (@Valid) → 400 with the offending fields. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return build(HttpStatus.BAD_REQUEST, message.isBlank() ? "Validation failed" : message, req);
    }

    /** Intentional domain errors thrown as ResponseStatusException keep their status. */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException ex, HttpServletRequest req) {
        return build(ex.getStatusCode(), ex.getReason() != null ? ex.getReason() : "Request failed", req);
    }

    /** Other status-carrying framework exceptions (404s, etc.) keep their status. */
    @ExceptionHandler(ErrorResponseException.class)
    public ResponseEntity<ApiError> handleErrorResponse(ErrorResponseException ex, HttpServletRequest req) {
        String message = ex.getBody().getDetail() != null ? ex.getBody().getDetail() : "Request failed";
        return build(ex.getStatusCode(), message, req);
    }

    /** Anything unexpected → 500, logged with stack trace, safe generic message. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest req) {
        log.error("Unhandled exception on {} {}", req.getMethod(), req.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.", req);
    }

    private ResponseEntity<ApiError> build(HttpStatusCode status, String message, HttpServletRequest req) {
        String reason = status instanceof HttpStatus hs ? hs.getReasonPhrase() : "Error";
        ApiError body = new ApiError(Instant.now().toString(), status.value(), reason, message,
                req.getRequestURI(), MDC.get("traceId"));
        return ResponseEntity.status(status).body(body);
    }
}
