/**
 * Response Formatter - Centralized response handling
 * Follows Single Responsibility Principle
 */

class ResponseFormatter {
    /**
     * Success response
     */
    success(res, { message = 'Success', data = null, metadata = null }, statusCode = 200) {
        const response = {
            success: true,
            message,
            timestamp: new Date().toISOString()
        };

        if (data !== null) {
            response.data = data;
        }

        if (metadata !== null) {
            response.metadata = metadata;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Error response
     */
    error(res, { message = 'Error occurred', error = null }, statusCode = 400) {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString()
        };

        if (error !== null) {
            response.error = typeof error === 'string' ? error : error.message || error;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Server error response
     */
    serverError(res, error, message = 'Internal server error') {
        console.error('Server Error:', error);
        
        return res.status(500).json({
            success: false,
            message,
            error: error.message || error,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Validation error response
     */
    validationError(res, errors, message = 'Validation failed') {
        return res.status(400).json({
            success: false,
            message,
            errors: Array.isArray(errors) ? errors : [errors],
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Not found response
     */
    notFound(res, message = 'Resource not found') {
        return res.status(404).json({
            success: false,
            message,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = ResponseFormatter;