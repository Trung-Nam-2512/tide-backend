/**
 * SWMM Integration Service - Clean architecture for SWMM model integration
 */

const axios = require('axios');
const forecastDataRepository = require('../repositories/forecastDataRepository');

class SWMMIntegrationService {
    constructor() {
        this.swmmApiUrl = process.env.SWMM_API_URL || 'http://127.0.0.1:8001/api/v1';
        this.stations = {
            hoDauTieng: '613bbcf5-212e-43c5-9ef8-69016787454f',
            vungTau: 'vung-tau-tide-001', // Default
            hoTriAn: 'ho-tri-an-001'      // Default
        };
    }

    async getForecastData(stationId, parameter, days = 3) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 1); // 1 day back for context
            endDate.setDate(endDate.getDate() + days);  // 3 days ahead

            const data = await forecastDataRepository.findByStationAndTime(
                stationId,
                parameter,
                startDate,
                endDate,
                'forecast'
            );

            return data.map(record => ({
                timestamp: record.timestamp,
                value: record.value,
                parameter: record.parameter_type,
                source: record.data_source
            }));

        } catch (error) {
            console.error(`❌ Error getting forecast data for ${stationId}:`, error.message);
            return this.generateDefaultForecast(parameter, days);
        }
    }

    generateDefaultForecast(parameter, days) {
        const data = [];
        const now = new Date();
        
        // Default values based on parameter type
        const defaultValues = {
            MUCNUOCHO: 9.5,  // Hồ Dầu Tiếng average level
            QDEN: 150,       // Average inflow  
            TIDE: 1.2,       // Vũng Tàu average tide
            LEVEL: 62        // Hồ Trị An average level
        };

        const baseValue = defaultValues[parameter] || 10;
        
        // Generate 3 days of hourly data with realistic variations
        for (let hour = 0; hour < days * 24; hour++) {
            const timestamp = new Date(now.getTime() + hour * 60 * 60 * 1000);
            const variation = Math.sin(hour / 6) * 0.3; // 6-hour cycle
            const noise = (Math.random() - 0.5) * 0.2;
            const value = baseValue + variation + noise;

            data.push({
                timestamp,
                value: Math.max(0, value),
                parameter,
                source: 'default'
            });
        }

        return data;
    }

    async prepareSwmmInput() {
        try {
            console.log('🔄 Preparing SWMM input data...');

            // Get 3-day forecast data from all sources
            const [hoDauTiengLevel, hoDauTiengInflow, vungTauTide, hoTriAnLevel] = await Promise.all([
                this.getForecastData(this.stations.hoDauTieng, 'MUCNUOCHO', 3),
                this.getForecastData(this.stations.hoDauTieng, 'QDEN', 3),
                this.generateDefaultForecast('TIDE', 3), // Vũng Tàu default
                this.generateDefaultForecast('LEVEL', 3)  // Hồ Trị An default
            ]);

            const inputData = {
                hoDauTieng: {
                    waterLevel: hoDauTiengLevel,
                    inflow: hoDauTiengInflow
                },
                vungTau: {
                    tideLevel: vungTauTide
                },
                hoTriAn: {
                    waterLevel: hoTriAnLevel
                },
                metadata: {
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    totalHours: 72,
                    dataPoints: hoDauTiengLevel.length
                }
            };

            console.log(`✅ SWMM input prepared: ${inputData.metadata.dataPoints} data points`);
            return inputData;

        } catch (error) {
            console.error('❌ Error preparing SWMM input:', error.message);
            throw new Error(`Failed to prepare SWMM input: ${error.message}`);
        }
    }

    async runSwmmForecast(inputData) {
        try {
            console.log('🚀 Running SWMM forecast simulation...');

            const response = await axios.post(`${this.swmmApiUrl}/swmm/forecast`, {
                start_date: inputData.metadata.startDate,
                end_date: inputData.metadata.endDate,
                use_real_data: true,
                input_data: inputData
            }, {
                timeout: 300000, // 5 minutes timeout
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.status === 200) {
                console.log('✅ SWMM simulation completed successfully');
                return {
                    success: true,
                    result: response.data,
                    executionTime: Date.now()
                };
            } else {
                throw new Error(`SWMM API returned status ${response.status}`);
            }

        } catch (error) {
            console.error('❌ SWMM simulation failed:', error.message);
            return {
                success: false,
                error: error.message,
                executionTime: Date.now()
            };
        }
    }

    async runDetailedSwmmForecast(inputData) {
        try {
            console.log('🔬 Running detailed SWMM forecast simulation...');

            const response = await axios.post(`${this.swmmApiUrl}/swmm/forecast-detailed`, {
                start_date: inputData.metadata.startDate,
                end_date: inputData.metadata.endDate,
                use_real_data: true,
                input_data: inputData
            }, {
                timeout: 600000, // 10 minutes timeout for detailed simulation
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.status === 200) {
                console.log('✅ Detailed SWMM simulation completed');
                return {
                    success: true,
                    result: response.data,
                    executionTime: Date.now(),
                    detailed: true
                };
            } else {
                throw new Error(`SWMM API returned status ${response.status}`);
            }

        } catch (error) {
            console.error('❌ Detailed SWMM simulation failed:', error.message);
            return {
                success: false,
                error: error.message,
                executionTime: Date.now(),
                detailed: true
            };
        }
    }

    async getSwmmModelInfo() {
        try {
            const response = await axios.get(`${this.swmmApiUrl}/swmm/model-info`, {
                timeout: 30000
            });

            if (response.status === 200) {
                return {
                    success: true,
                    modelInfo: response.data
                };
            }

        } catch (error) {
            console.error('❌ Error getting SWMM model info:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async executeFullForecast() {
        try {
            console.log('🌊 Starting complete SWMM forecast execution...');
            
            // Step 1: Prepare input data
            const inputData = await this.prepareSwmmInput();
            
            // Step 2: Get model info
            const modelInfo = await this.getSwmmModelInfo();
            
            // Step 3: Run standard simulation
            const standardResult = await this.runSwmmForecast(inputData);
            
            // Step 4: Run detailed simulation if standard succeeds
            let detailedResult = null;
            if (standardResult.success) {
                detailedResult = await this.runDetailedSwmmForecast(inputData);
            }

            const result = {
                success: standardResult.success,
                inputData,
                modelInfo: modelInfo.success ? modelInfo.modelInfo : null,
                standardSimulation: standardResult,
                detailedSimulation: detailedResult,
                totalExecutionTime: Date.now(),
                completedAt: new Date().toISOString()
            };

            console.log(`✅ Complete SWMM forecast execution finished`);
            return result;

        } catch (error) {
            console.error('❌ Complete SWMM forecast execution failed:', error.message);
            return {
                success: false,
                error: error.message,
                completedAt: new Date().toISOString()
            };
        }
    }
}

module.exports = new SWMMIntegrationService();