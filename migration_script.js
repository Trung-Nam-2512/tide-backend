/**
 * COMPLETE MIGRATION SCRIPT
 * Chuyển đổi từ cấu trúc cũ sang cấu trúc mới
 * 🔒 AN TOÀN - Không xóa data cũ cho đến khi xác nhận thành công
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const BinhDuongModel = require('./src/models/binhDuongModel');
const { StationMetadataV2, CurrentDataV2, TimeseriesBucketV2 } = require('./new_timeseries_schema');

class DataMigrator {
    constructor() {
        this.stats = {
            totalStations: 0,
            migratedStations: 0,
            totalHistoryEntries: 0,
            migratedEntries: 0,
            totalBuckets: 0,
            errors: []
        };
    }

    async connect() {
        try {
            await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hydrology');
            console.log('✅ Connected to MongoDB');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }

    // Step 1: Backup existing data
    async createBackup() {
        console.log('\n📦 STEP 1: Creating backup...');

        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const backupCollectionName = `binhduongstations_backup_${timestamp}`;

        try {
            const db = mongoose.connection.db;
            await db.collection('binhduongstations').aggregate([
                { $out: backupCollectionName }
            ]).toArray();

            console.log(`✅ Backup created: ${backupCollectionName}`);
            return backupCollectionName;
        } catch (error) {
            console.error('❌ Backup failed:', error.message);
            throw error;
        }
    }

    // Step 2: Migrate station metadata
    async migrateStationMetadata() {
        console.log('\n🏗️ STEP 2: Migrating station metadata...');

        const oldStations = await BinhDuongModel.find({});
        this.stats.totalStations = oldStations.length;

        for (const station of oldStations) {
            try {
                // Extract parameters from current data and history
                const parameters = this.extractParameters(station);

                const newMetadata = new StationMetadataV2({
                    key: station.key,
                    name: station.name,
                    address: station.address,
                    mapLocation: station.mapLocation,
                    province: station.province,
                    stationType: station.stationType,
                    parameters: parameters,
                    createdAt: station.createdAt || new Date(),
                    updatedAt: station.updatedAt || new Date()
                });

                await newMetadata.save();
                this.stats.migratedStations++;
                console.log(`  ✅ Migrated metadata: ${station.key}`);

            } catch (error) {
                this.stats.errors.push(`Station ${station.key}: ${error.message}`);
                console.error(`  ❌ Error migrating ${station.key}:`, error.message);
            }
        }

        console.log(`✅ Metadata migration completed: ${this.stats.migratedStations}/${this.stats.totalStations}`);
    }

    // Step 3: Migrate current data
    async migrateCurrentData() {
        console.log('\n🔄 STEP 3: Migrating current data...');

        const oldStations = await BinhDuongModel.find({});

        for (const station of oldStations) {
            try {
                if (station.currentData) {
                    const newCurrentData = new CurrentDataV2({
                        stationKey: station.key,
                        receivedAt: station.currentData.receivedAt,
                        data: this.transformMeasuringLogs(station.currentData.measuringLogs),
                        rawData: station.currentData.measuringLogs
                    });

                    await newCurrentData.save();
                    console.log(`  ✅ Migrated current data: ${station.key}`);
                }
            } catch (error) {
                this.stats.errors.push(`Current data ${station.key}: ${error.message}`);
                console.error(`  ❌ Error migrating current data ${station.key}:`, error.message);
            }
        }
    }

    // Step 4: Migrate historical data to buckets
    async migrateHistoricalData() {
        console.log('\n📊 STEP 4: Migrating historical data to buckets...');

        const oldStations = await BinhDuongModel.find({});

        for (const station of oldStations) {
            try {
                if (station.history && station.history.length > 0) {
                    console.log(`  📈 Processing ${station.history.length} entries for ${station.key}`);

                    // Group history by date
                    const bucketMap = this.groupHistoryByDate(station.history);

                    // Create buckets
                    for (const [dateStr, measurements] of Object.entries(bucketMap)) {
                        const bucket = new TimeseriesBucketV2({
                            stationKey: station.key,
                            bucketDate: new Date(dateStr),
                            measurements: measurements,
                            count: measurements.length,
                            dataHash: this.generateDataHash(measurements)
                        });

                        await bucket.save();
                        this.stats.totalBuckets++;
                    }

                    this.stats.totalHistoryEntries += station.history.length;
                    this.stats.migratedEntries += station.history.length;
                    console.log(`  ✅ Created ${Object.keys(bucketMap).length} buckets for ${station.key}`);
                }
            } catch (error) {
                this.stats.errors.push(`History ${station.key}: ${error.message}`);
                console.error(`  ❌ Error migrating history ${station.key}:`, error.message);
            }
        }

        console.log(`✅ Historical data migration completed: ${this.stats.migratedEntries} entries in ${this.stats.totalBuckets} buckets`);
    }

    // Step 5: Validate migrated data
    async validateMigration() {
        console.log('\n🔍 STEP 5: Validating migration...');

        // Check counts
        const oldStationCount = await BinhDuongModel.countDocuments();
        const newStationCount = await StationMetadataV2.countDocuments();
        const currentDataCount = await CurrentDataV2.countDocuments();
        const bucketCount = await TimeseriesBucketV2.countDocuments();

        console.log('📊 Validation Results:');
        console.log(`  - Old stations: ${oldStationCount}`);
        console.log(`  - New stations: ${newStationCount}`);
        console.log(`  - Current data records: ${currentDataCount}`);
        console.log(`  - Timeseries buckets: ${bucketCount}`);

        // Validate data integrity for each station
        const validationResults = [];
        const oldStations = await BinhDuongModel.find({});

        for (const station of oldStations) {
            const result = await this.validateStationData(station);
            validationResults.push(result);
        }

        const successfulValidations = validationResults.filter(r => r.success);
        console.log(`✅ Validation successful for ${successfulValidations.length}/${validationResults.length} stations`);

        return successfulValidations.length === validationResults.length;
    }

    // Utility functions
    extractParameters(station) {
        const paramMap = new Map();

        // From current data
        if (station.currentData?.measuringLogs) {
            Object.values(station.currentData.measuringLogs).forEach(param => {
                if (param.key && param.name) {
                    paramMap.set(param.key, {
                        key: param.key,
                        name: param.name,
                        unit: param.unit,
                        maxLimit: param.maxLimit,
                        minLimit: param.minLimit,
                        dataType: 'number'
                    });
                }
            });
        }

        // From history
        if (station.history) {
            station.history.forEach(entry => {
                if (entry.measuringLogs) {
                    Object.values(entry.measuringLogs).forEach(param => {
                        if (param.key && param.name && !paramMap.has(param.key)) {
                            paramMap.set(param.key, {
                                key: param.key,
                                name: param.name,
                                unit: param.unit,
                                maxLimit: param.maxLimit,
                                minLimit: param.minLimit,
                                dataType: 'number'
                            });
                        }
                    });
                }
            });
        }

        return Array.from(paramMap.values());
    }

    transformMeasuringLogs(measuringLogs) {
        if (!measuringLogs) return {};

        const transformed = {};
        Object.entries(measuringLogs).forEach(([key, param]) => {
            transformed[key] = {
                value: param.value,
                unit: param.unit,
                warningLevel: param.warningLevel,
                statusDevice: param.statusDevice
            };
        });
        return transformed;
    }

    groupHistoryByDate(history) {
        const bucketMap = {};

        history.forEach(entry => {
            const date = new Date(entry.timestamp);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

            if (!bucketMap[dateStr]) {
                bucketMap[dateStr] = [];
            }

            bucketMap[dateStr].push({
                timestamp: entry.timestamp,
                data: this.transformMeasuringLogs(entry.measuringLogs),
                quality: 'good'
            });
        });

        return bucketMap;
    }

    generateDataHash(measurements) {
        // Simple hash for data integrity
        const crypto = require('crypto');
        const dataStr = JSON.stringify(measurements.map(m => ({ t: m.timestamp, d: m.data })));
        return crypto.createHash('md5').update(dataStr).digest('hex');
    }

    async validateStationData(oldStation) {
        try {
            // Check metadata
            const metadata = await StationMetadataV2.findOne({ key: oldStation.key });
            if (!metadata) {
                return { stationKey: oldStation.key, success: false, error: 'Metadata not found' };
            }

            // Check current data
            const currentData = await CurrentDataV2.findOne({ stationKey: oldStation.key });
            if (!currentData && oldStation.currentData) {
                return { stationKey: oldStation.key, success: false, error: 'Current data not found' };
            }

            // Check history count
            const totalBucketEntries = await TimeseriesBucketV2.aggregate([
                { $match: { stationKey: oldStation.key } },
                { $project: { count: { $size: '$measurements' } } },
                { $group: { _id: null, total: { $sum: '$count' } } }
            ]);

            const expectedCount = oldStation.history ? oldStation.history.length : 0;
            const actualCount = totalBucketEntries[0]?.total || 0;

            if (expectedCount !== actualCount) {
                return {
                    stationKey: oldStation.key,
                    success: false,
                    error: `History count mismatch: expected ${expectedCount}, got ${actualCount}`
                };
            }

            return { stationKey: oldStation.key, success: true };

        } catch (error) {
            return { stationKey: oldStation.key, success: false, error: error.message };
        }
    }

    // Main migration process
    async runMigration() {
        console.log('🚀 STARTING COMPLETE DATA MIGRATION');
        console.log('=====================================');

        try {
            await this.connect();

            // Step 1: Backup
            const backupName = await this.createBackup();

            // Step 2: Migrate metadata
            await this.migrateStationMetadata();

            // Step 3: Migrate current data
            await this.migrateCurrentData();

            // Step 4: Migrate historical data
            await this.migrateHistoricalData();

            // Step 5: Validate
            const isValid = await this.validateMigration();

            // Final report
            console.log('\n📈 MIGRATION COMPLETED');
            console.log('=======================');
            console.log('Statistics:', JSON.stringify(this.stats, null, 2));

            if (isValid && this.stats.errors.length === 0) {
                console.log('\n🎉 MIGRATION SUCCESSFUL!');
                console.log('✅ All data migrated successfully');
                console.log('✅ Data integrity validated');
                console.log(`✅ Backup available: ${backupName}`);
                console.log('\n🔥 Ready to switch to new schema!');
            } else {
                console.log('\n⚠️  MIGRATION COMPLETED WITH ISSUES');
                console.log('Errors:', this.stats.errors);
                console.log('Please review before proceeding');
            }

        } catch (error) {
            console.error('\n💥 MIGRATION FAILED:', error.message);
            throw error;
        } finally {
            await this.disconnect();
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    const migrator = new DataMigrator();
    migrator.runMigration().catch(console.error);
}

module.exports = DataMigrator;