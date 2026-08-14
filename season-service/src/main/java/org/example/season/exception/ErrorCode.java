package org.example.season.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

        UNCATEGORIZED_EXCEPTION("ERR_UNCATEGORIZED_EXCEPTION", "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
        KEY_INVALID("ERR_KEY_INVALID", "Invalid key", HttpStatus.BAD_REQUEST),
        INTERNAL_SERVER_ERROR("ERR_INTERNAL_SERVER_ERROR", "Internal server error", HttpStatus.INTERNAL_SERVER_ERROR),
        DOWNSTREAM_GUARD_UNAVAILABLE("ERR_DOWNSTREAM_GUARD_UNAVAILABLE", "Cannot verify related data because a downstream service is unavailable", HttpStatus.SERVICE_UNAVAILABLE),
        BAD_REQUEST("ERR_BAD_REQUEST", "Bad request", HttpStatus.BAD_REQUEST),
        UNAUTHORIZED("ERR_UNAUTHORIZED", "Unauthorized", HttpStatus.UNAUTHORIZED),
        FORBIDDEN("ERR_FORBIDDEN", "Forbidden", HttpStatus.FORBIDDEN),
        RESOURCE_NOT_FOUND("ERR_RESOURCE_NOT_FOUND", "Resource not found", HttpStatus.NOT_FOUND),
        DUPLICATE_RESOURCE("ERR_DUPLICATE_RESOURCE", "Resource already exists", HttpStatus.CONFLICT),
        UNAUTHENTICATED("ERR_UNAUTHENTICATED", "Unauthenticated", HttpStatus.UNAUTHORIZED),
        USER_NOT_FOUND("ERR_USER_NOT_FOUND", "User not found", HttpStatus.NOT_FOUND),
        USER_INACTIVE("ERR_USER_INACTIVE", "Your account has been deactivated. Please contact administrator.", HttpStatus.FORBIDDEN),
        PLOT_NOT_FOUND("ERR_PLOT_NOT_FOUND", "Plot not found", HttpStatus.NOT_FOUND),
        PLOT_NAME_EXISTS("ERR_PLOT_NAME_EXISTS", "Plot name already exists", HttpStatus.CONFLICT),
        FARM_NOT_FOUND("ERR_FARM_NOT_FOUND", "Farm not found", HttpStatus.NOT_FOUND),
        FARM_INACTIVE("ERR_FARM_INACTIVE", "Farm must be active to create plots or seasons", HttpStatus.BAD_REQUEST),
        CROP_NOT_FOUND("ERR_CROP_NOT_FOUND", "Crop not found", HttpStatus.NOT_FOUND),
        SEASON_NOT_FOUND("ERR_SEASON_NOT_FOUND", "Season not found", HttpStatus.NOT_FOUND),
        INVALID_SEASON_DATES("ERR_INVALID_SEASON_DATES", "Season start date must be before end date", HttpStatus.BAD_REQUEST),
        SEASON_OVERLAP("ERR_SEASON_OVERLAP", "Season dates overlap with an existing season on the same plot", HttpStatus.BAD_REQUEST),
        INVALID_SEASON_STATUS_TRANSITION("ERR_INVALID_SEASON_STATUS_TRANSITION", "Invalid season status transition", HttpStatus.BAD_REQUEST),
        SEASON_HAS_CHILD_RECORDS("ERR_SEASON_HAS_CHILD_RECORDS", "Cannot delete season with related harvests, expenses or sales", HttpStatus.BAD_REQUEST),
        HARVEST_NOT_FOUND("ERR_HARVEST_NOT_FOUND", "Harvest not found", HttpStatus.NOT_FOUND),
        INVALID_HARVEST_QUANTITY("ERR_INVALID_HARVEST_QUANTITY", "Invalid harvest quantity", HttpStatus.BAD_REQUEST),
        TASK_NOT_FOUND("ERR_TASK_NOT_FOUND", "Task not found", HttpStatus.NOT_FOUND),
        INVALID_TASK_STATUS_TRANSITION("ERR_INVALID_TASK_STATUS_TRANSITION", "Invalid task status transition", HttpStatus.BAD_REQUEST),
        INVALID_OPERATION("ERR_INVALID_OPERATION", "Invalid operation for current task status", HttpStatus.BAD_REQUEST),
        INVALID_DATE_RANGE("ERR_INVALID_DATE_RANGE", "Invalid date range: end date must be after or equal to start date", HttpStatus.BAD_REQUEST),
        SEASON_CLOSED_CANNOT_ADD_TASK("ERR_SEASON_CLOSED_CANNOT_ADD_TASK", "Cannot add task to closed season", HttpStatus.BAD_REQUEST),
        SEASON_CLOSED_CANNOT_MODIFY_TASK("ERR_SEASON_CLOSED_CANNOT_MODIFY_TASK", "Cannot modify task of closed season", HttpStatus.BAD_REQUEST),
        EMPLOYEE_ROLE_REQUIRED("ERR_EMPLOYEE_ROLE_REQUIRED", "Selected user must have EMPLOYEE role", HttpStatus.BAD_REQUEST),
        SEASON_EMPLOYEE_NOT_FOUND("ERR_SEASON_EMPLOYEE_NOT_FOUND", "Employee is not registered in this season", HttpStatus.NOT_FOUND),
        SEASON_EMPLOYEE_ALREADY_EXISTS("ERR_SEASON_EMPLOYEE_ALREADY_EXISTS", "Employee already exists in this season", HttpStatus.CONFLICT),
        FIELD_LOG_NOT_FOUND("ERR_FIELD_LOG_NOT_FOUND", "Field log not found", HttpStatus.NOT_FOUND),
        INVALID_LOG_TYPE("ERR_INVALID_LOG_TYPE", "Invalid log type.", HttpStatus.BAD_REQUEST),
        PESTICIDE_PHI_NOT_FOUND("ERR_PESTICIDE_PHI_NOT_FOUND", "Cannot determine pesticide PHI. Use a known pesticide or provide PHI days manually.", HttpStatus.BAD_REQUEST),
        SEASON_CLOSED_CANNOT_ADD_FIELD_LOG("ERR_SEASON_CLOSED_CANNOT_ADD_FIELD_LOG", "Cannot add field log to closed season", HttpStatus.BAD_REQUEST),
        SEASON_CLOSED_CANNOT_MODIFY_FIELD_LOG("ERR_SEASON_CLOSED_CANNOT_MODIFY_FIELD_LOG", "Cannot modify field log of closed season", HttpStatus.BAD_REQUEST),
        DISEASE_RECORD_NOT_FOUND("ERR_DISEASE_RECORD_NOT_FOUND", "Disease record not found", HttpStatus.NOT_FOUND),
        DISEASE_TREATMENT_NOT_FOUND("ERR_DISEASE_TREATMENT_NOT_FOUND", "Disease treatment not found", HttpStatus.NOT_FOUND),
        INVALID_DISEASE_SEVERITY("ERR_INVALID_DISEASE_SEVERITY", "Invalid disease severity", HttpStatus.BAD_REQUEST),
        INVALID_DISEASE_STATUS("ERR_INVALID_DISEASE_STATUS", "Invalid disease status", HttpStatus.BAD_REQUEST),
        INVALID_TREATMENT_EFFECTIVENESS("ERR_INVALID_TREATMENT_EFFECTIVENESS", "Invalid treatment effectiveness", HttpStatus.BAD_REQUEST),
        INVALID_DISEASE_DETECTED_AT("ERR_INVALID_DISEASE_DETECTED_AT", "Detected date must be within season date range", HttpStatus.BAD_REQUEST),
        INVALID_DISEASE_TREATED_AT("ERR_INVALID_DISEASE_TREATED_AT", "Treatment time cannot be earlier than disease detected time", HttpStatus.BAD_REQUEST),
        SEASON_CLOSED_CANNOT_ADD_DISEASE_RECORD("ERR_SEASON_CLOSED_CANNOT_ADD_DISEASE_RECORD", "Cannot add disease record to closed season", HttpStatus.BAD_REQUEST),
        SEASON_CLOSED_CANNOT_MODIFY_DISEASE_RECORD("ERR_SEASON_CLOSED_CANNOT_MODIFY_DISEASE_RECORD", "Cannot modify disease record in closed season", HttpStatus.BAD_REQUEST),
        DISEASE_REFERENCE_SEASON_MISMATCH("ERR_DISEASE_REFERENCE_SEASON_MISMATCH", "Referenced incident/expense does not belong to the same season", HttpStatus.BAD_REQUEST),
        DISEASE_SUPPLY_ITEM_LOT_MISMATCH("ERR_DISEASE_SUPPLY_ITEM_LOT_MISMATCH", "Supply item does not match selected supply lot", HttpStatus.BAD_REQUEST),
        SEASON_NAME_EXISTS_IN_PLOT("ERR_SEASON_NAME_EXISTS_IN_PLOT", "Season name already exists in this plot", HttpStatus.CONFLICT),
        SUPPLY_ITEM_NOT_FOUND("ERR_SUPPLY_ITEM_NOT_FOUND", "Supply item not found", HttpStatus.NOT_FOUND),
        TASK_NOT_ASSIGNED_TO_EMPLOYEE("ERR_TASK_NOT_ASSIGNED_TO_EMPLOYEE", "Task is not assigned to the current employee", HttpStatus.FORBIDDEN),
        INSUFFICIENT_STOCK("ERR_INSUFFICIENT_STOCK", "Insufficient stock for this operation", HttpStatus.BAD_REQUEST),
        HARVEST_DATE_BEFORE_PLANTING("ERR_HARVEST_DATE_BEFORE_PLANTING", "Harvest date cannot be before planting date", HttpStatus.BAD_REQUEST),
        HARVEST_ALREADY_RECEIVED_TO_PRODUCT_WAREHOUSE("ERR_HARVEST_ALREADY_RECEIVED_TO_PRODUCT_WAREHOUSE", "Harvest has already been received into product warehouse and cannot be edited", HttpStatus.BAD_REQUEST),
        EXPENSE_NOT_FOUND("ERR_EXPENSE_NOT_FOUND", "Expense not found", HttpStatus.NOT_FOUND),
        SUPPLY_LOT_NOT_FOUND("ERR_SUPPLY_LOT_NOT_FOUND", "Supply lot not found", HttpStatus.NOT_FOUND),
        INCIDENT_NOT_FOUND("ERR_INCIDENT_NOT_FOUND", "Incident not found", HttpStatus.NOT_FOUND),
        MSG_1_MANDATORY_FIELD_EMPTY("MSG_1", "Please enter mandatory data.", HttpStatus.BAD_REQUEST),
        MSG_4_INVALID_FORMAT("MSG_4", "Invalid data format. Please enter again.", HttpStatus.BAD_REQUEST),
        MSG_7_SAVE_SUCCESS("MSG_7", "Save data successful.", HttpStatus.OK),
        MSG_9_CONSTRAINT_VIOLATION("MSG_9", "Your action is failed due to constraints in the system.", HttpStatus.BAD_REQUEST),
        MSG_10_SEASON_NOT_FOUND("MSG_10", "Season not found.", HttpStatus.NOT_FOUND),
        MSG_11_CONFIRMATION("MSG_11", "Are you sure you want to proceed with this action?", HttpStatus.OK);


        ErrorCode(String code, String message, HttpStatus statusCode) {
                this.code = code;
                this.message = message;
                this.statusCode = statusCode;
        }

        private final String code;
        private final String message;
        private final HttpStatus statusCode;
}
