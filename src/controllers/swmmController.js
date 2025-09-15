/**
 * SWMM Controller - Clean API for SWMM model integration
 */

const swmmIntegrationService = require('../services/swmmIntegrationService');

class SWMMController {
    constructor() {
        // Bind methods to preserve context
        this.getModelInfo = this.getModelInfo.bind(this);
        this.runForecast = this.runForecast.bind(this);
        this.runDetailedForecast = this.runDetailedForecast.bind(this);
        this.executeFullSimulation = this.executeFullSimulation.bind(this);
    }

    successResponse(res, data, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            data,
            message,
            timestamp: new Date().toISOString()
        });
    }

    errorResponse(res, error, message = 'Error', statusCode = 500) {
        console.error('SWMM Controller Error:', error);
        return res.status(statusCode).json({
            success: false,
            error: error?.message || error,
            message,
            timestamp: new Date().toISOString()
        });
    }

    async getModelInfo(req, res) {
        try {
            console.log('🔍 Getting SWMM model information...');
            
            const result = await swmmIntegrationService.getSwmmModelInfo();
            
            if (result.success) {
                return this.successResponse(
                    res, 
                    result.modelInfo, 
                    'SWMM model information retrieved successfully'
                );
            } else {
                return this.errorResponse(
                    res, 
                    result.error, 
                    'Failed to get SWMM model information',
                    503
                );
            }

        } catch (error) {
            return this.errorResponse(res, error, 'Model info request failed');
        }
    }

    async runForecast(req, res) {
        try {
            console.log('🌊 Starting SWMM forecast simulation...');
            
            // Prepare input data
            const inputData = await swmmIntegrationService.prepareSwmmInput();
            
            // Run simulation
            const result = await swmmIntegrationService.runSwmmForecast(inputData);
            
            if (result.success) {
                return this.successResponse(
                    res,
                    {
                        simulation: result.result,
                        inputData: inputData.metadata,
                        executionTime: result.executionTime
                    },
                    'SWMM forecast completed successfully'
                );
            } else {
                return this.errorResponse(
                    res,
                    result.error,
                    'SWMM forecast simulation failed',
                    500
                );
            }

        } catch (error) {
            return this.errorResponse(res, error, 'Forecast request failed');
        }
    }

    async runDetailedForecast(req, res) {
        try {
            console.log('🔬 Starting detailed SWMM forecast simulation...');
            
            // Prepare input data
            const inputData = await swmmIntegrationService.prepareSwmmInput();
            
            // Run detailed simulation
            const result = await swmmIntegrationService.runDetailedSwmmForecast(inputData);
            
            if (result.success) {
                return this.successResponse(
                    res,
                    {
                        simulation: result.result,
                        inputData: inputData.metadata,
                        executionTime: result.executionTime,
                        detailed: true
                    },
                    'Detailed SWMM forecast completed successfully'
                );
            } else {
                return this.errorResponse(
                    res,
                    result.error,
                    'Detailed SWMM forecast simulation failed',
                    500
                );
            }

        } catch (error) {
            return this.errorResponse(res, error, 'Detailed forecast request failed');
        }
    }

    async executeFullSimulation(req, res) {
        try {
            console.log('🚀 Starting complete SWMM simulation execution...');
            
            const result = await swmmIntegrationService.executeFullForecast();
            
            if (result.success) {
                return this.successResponse(
                    res,
                    {
                        inputData: result.inputData.metadata,
                        modelInfo: result.modelInfo,
                        standardSimulation: {
                            success: result.standardSimulation.success,
                            hasData: !!result.standardSimulation.result
                        },
                        detailedSimulation: result.detailedSimulation ? {
                            success: result.detailedSimulation.success,
                            hasData: !!result.detailedSimulation.result
                        } : null,
                        executionTime: result.totalExecutionTime,
                        completedAt: result.completedAt
                    },
                    'Complete SWMM simulation executed successfully'
                );
            } else {
                return this.errorResponse(
                    res,
                    result.error,
                    'Complete SWMM simulation failed',
                    500
                );
            }

        } catch (error) {
            return this.errorResponse(res, error, 'Full simulation request failed');
        }
    }

    async validateSwmmConnection(req, res) {
        try {
            console.log('🔗 Validating SWMM service connection...');
            
            const modelInfoResult = await swmmIntegrationService.getSwmmModelInfo();
            
            const connectionStatus = {
                swmmServiceConnected: modelInfoResult.success,
                modelLoaded: modelInfoResult.success && !!modelInfoResult.modelInfo?.model_exists,
                totalNodes: modelInfoResult.modelInfo?.total_nodes || 0,
                totalLinks: modelInfoResult.modelInfo?.total_links || 0,
                geographicCoverage: modelInfoResult.modelInfo?.geographic_coverage || null,
                testTime: new Date().toISOString()
            };

            if (connectionStatus.swmmServiceConnected && connectionStatus.modelLoaded) {
                return this.successResponse(
                    res,
                    connectionStatus,
                    'SWMM service connection validated successfully'
                );
            } else {
                return this.errorResponse(
                    res,
                    'SWMM service or model not available',
                    'SWMM connection validation failed',
                    503
                );
            }

        } catch (error) {
            return this.errorResponse(res, error, 'Connection validation failed');
        }
    }

    async getInputDataPreview(req, res) {
        try {
            console.log('👀 Preparing SWMM input data preview...');
            
            const inputData = await swmmIntegrationService.prepareSwmmInput();
            
            // Create preview with limited data points
            const preview = {
                metadata: inputData.metadata,
                dataSummary: {
                    hoDauTieng: {
                        waterLevelPoints: inputData.hoDauTieng.waterLevel.length,
                        inflowPoints: inputData.hoDauTieng.inflow.length,
                        waterLevelRange: this.getDataRange(inputData.hoDauTieng.waterLevel),
                        inflowRange: this.getDataRange(inputData.hoDauTieng.inflow)
                    },
                    vungTau: {
                        tideLevelPoints: inputData.vungTau.tideLevel.length,
                        tideLevelRange: this.getDataRange(inputData.vungTau.tideLevel)
                    },
                    hoTriAn: {
                        waterLevelPoints: inputData.hoTriAn.waterLevel.length,
                        waterLevelRange: this.getDataRange(inputData.hoTriAn.waterLevel)
                    }
                },
                sampleData: {
                    hoDauTiengWaterLevel: inputData.hoDauTieng.waterLevel.slice(0, 5),
                    hoDauTiengInflow: inputData.hoDauTieng.inflow.slice(0, 5),
                    vungTauTide: inputData.vungTau.tideLevel.slice(0, 5)
                }
            };

            return this.successResponse(
                res,
                preview,
                'SWMM input data preview generated successfully'
            );

        } catch (error) {
            return this.errorResponse(res, error, 'Input data preview failed');
        }
    }

    getDataRange(dataArray) {
        if (!dataArray || dataArray.length === 0) return { min: 0, max: 0, avg: 0 };
        
        const values = dataArray.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        
        return {
            min: Number(min.toFixed(2)),
            max: Number(max.toFixed(2)),
            avg: Number(avg.toFixed(2))
        };
    }
}

module.exports = new SWMMController();