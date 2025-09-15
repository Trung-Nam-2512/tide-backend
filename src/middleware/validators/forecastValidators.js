/**
 * Forecast Data Validators - Centralized validation logic
 */

const { body, param, query, validationResult } = require('express-validator');

// Constants
const VALID_PARAMETERS = ['MUCNUOCHO', 'QDEN'];
const VALID_DATA_SOURCES = ['realtime', 'forecast'];

/**
 * Validation middleware factory
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg,
                value: err.value
            })),
            timestamp: new Date().toISOString()
        });
    }
    next();
};

/**
 * Parameter validation
 */
const validateParameter = param('parameter')
    .optional()
    .toUpperCase()
    .isIn(VALID_PARAMETERS)
    .withMessage(`Parameter must be one of: ${VALID_PARAMETERS.join(', ')}`);

const validateRequiredParameter = param('parameter')
    .toUpperCase()
    .isIn(VALID_PARAMETERS)
    .withMessage(`Parameter must be one of: ${VALID_PARAMETERS.join(', ')}`);

/**
 * Date range validation
 */
const validateDateRange = [
    query('startDate')
        .notEmpty()
        .withMessage('startDate is required')
        .isISO8601()
        .withMessage('startDate must be valid ISO 8601 date'),
    
    query('endDate')
        .notEmpty()
        .withMessage('endDate is required')
        .isISO8601()
        .withMessage('endDate must be valid ISO 8601 date')
        .custom((endDate, { req }) => {
            const start = new Date(req.query.startDate);
            const end = new Date(endDate);
            if (start >= end) {
                throw new Error('endDate must be after startDate');
            }
            return true;
        })
];

/**
 * Data source validation
 */
const validateDataSource = query('dataSource')
    .optional()
    .toLowerCase()
    .isIn(VALID_DATA_SOURCES)
    .withMessage(`dataSource must be one of: ${VALID_DATA_SOURCES.join(', ')}`);

/**
 * Combined validators for different endpoints
 */
const validators = {
    fetchData: [validateParameter, validateRequest],
    latestData: [validateParameter, validateDataSource, validateRequest],
    rangeData: [validateRequiredParameter, ...validateDateRange, validateDataSource, validateRequest],
    parameter: validateParameter
};

module.exports = {
    validators,
    validateRequest,
    VALID_PARAMETERS,
    VALID_DATA_SOURCES
};