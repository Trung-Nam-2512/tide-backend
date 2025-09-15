/**
 * Station Repository - Data access layer cho station management
 */

const ForecastStation = require('../models/ForecastStation');

class StationRepository {
    constructor() {
        this.model = ForecastStation;
    }

    /**
     * Tìm station theo UUID
     */
    async findByUuid(hcUuid) {
        return await this.model.findOne({ hc_uuid: hcUuid }).lean();
    }

    /**
     * Tìm tất cả stations theo status
     */
    async findByStatus(status = 'active') {
        return await this.model.find({ status }).sort({ station_name: 1 }).lean();
    }

    /**
     * Tìm stations theo tỉnh
     */
    async findByProvince(province) {
        return await this.model.find({
            province: province,
            status: 'active'
        }).sort({ station_name: 1 }).lean();
    }

    /**
     * Tìm stations theo district
     */
    async findByDistrict(district) {
        return await this.model.find({
            district: district,
            status: 'active'
        }).sort({ station_name: 1 }).lean();
    }

    /**
     * Tìm stations theo river system
     */
    async findByRiverSystem(riverSystem) {
        return await this.model.find({
            river_system: riverSystem,
            status: 'active'
        }).sort({ station_name: 1 }).lean();
    }

    /**
     * Tạo station mới
     */
    async create(stationData) {
        const station = new this.model(stationData);
        return await station.save();
    }

    /**
     * Cập nhật station
     */
    async update(hcUuid, updateData) {
        return await this.model.findOneAndUpdate(
            { hc_uuid: hcUuid },
            updateData,
            { new: true, runValidators: true }
        );
    }

    /**
     * Xóa station
     */
    async delete(hcUuid) {
        return await this.model.deleteOne({ hc_uuid: hcUuid });
    }

    /**
     * Cập nhật status station
     */
    async updateStatus(hcUuid, status) {
        return await this.model.findOneAndUpdate(
            { hc_uuid: hcUuid },
            { status },
            { new: true }
        );
    }

    /**
     * Đếm số lượng stations
     */
    async count(query = {}) {
        return await this.model.countDocuments(query);
    }

    /**
     * Tìm tất cả stations với pagination
     */
    async findWithPagination(page = 1, limit = 10, query = {}) {
        const skip = (page - 1) * limit;
        
        const [stations, total] = await Promise.all([
            this.model.find(query)
                .sort({ station_name: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.model.countDocuments(query)
        ]);

        return {
            stations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Tìm station có coordinates
     */
    async findStationsWithLocation() {
        return await this.model.find({
            latitude: { $exists: true, $ne: null },
            longitude: { $exists: true, $ne: null },
            status: 'active'
        }).lean();
    }

    /**
     * Tìm theo text search
     */
    async searchByName(searchText) {
        const regex = new RegExp(searchText, 'i');
        return await this.model.find({
            $or: [
                { station_name: regex },
                { hc_uuid: regex },
                { province: regex },
                { district: regex }
            ],
            status: 'active'
        }).sort({ station_name: 1 }).lean();
    }

    /**
     * Lấy danh sách tỉnh có stations
     */
    async getAvailableProvinces() {
        return await this.model.distinct('province', { 
            status: 'active',
            province: { $exists: true, $ne: null, $ne: '' }
        });
    }

    /**
     * Lấy danh sách districts theo province
     */
    async getDistrictsByProvince(province) {
        return await this.model.distinct('district', {
            province: province,
            status: 'active',
            district: { $exists: true, $ne: null, $ne: '' }
        });
    }

    /**
     * Lấy danh sách river systems
     */
    async getAvailableRiverSystems() {
        return await this.model.distinct('river_system', {
            status: 'active',
            river_system: { $exists: true, $ne: null, $ne: '' }
        });
    }

    /**
     * Bulk operations
     */
    async bulkCreate(stationsData) {
        return await this.model.insertMany(stationsData, { ordered: false });
    }

    async bulkUpdate(operations) {
        const bulkOps = operations.map(op => ({
            updateOne: {
                filter: { hc_uuid: op.hc_uuid },
                update: op.update,
                upsert: op.upsert || false
            }
        }));

        return await this.model.bulkWrite(bulkOps);
    }
}

module.exports = new StationRepository();