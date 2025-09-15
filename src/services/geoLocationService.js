/**
 * GeoLocation Service - Xử lý các tính năng địa lý cho stations
 */

const stationRepository = require('../repositories/stationRepository');

class GeoLocationService {
    constructor() {
        // Constants cho geo calculations
        this.EARTH_RADIUS_KM = 6371;
        this.VIETNAM_BOUNDS = {
            north: 23.393395,
            south: 8.179154,
            east: 109.464638,
            west: 102.144927
        };
    }

    /**
     * Tính khoảng cách giữa 2 điểm (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (!this._isValidCoordinate(lat1, lon1) || !this._isValidCoordinate(lat2, lon2)) {
            throw new Error('Invalid coordinates provided');
        }

        const dLat = this._toRadians(lat2 - lat1);
        const dLon = this._toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this._toRadians(lat1)) * Math.cos(this._toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = this.EARTH_RADIUS_KM * c;
        
        return Math.round(distance * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Tìm stations gần một vị trí
     */
    async findNearbyStations(latitude, longitude, maxDistanceKm = 50, limit = 10) {
        if (!this._isValidCoordinate(latitude, longitude)) {
            throw new Error('Invalid coordinates provided');
        }

        // Lấy tất cả stations có coordinates
        const stations = await stationRepository.findStationsWithLocation();
        
        // Tính khoảng cách và filter
        const stationsWithDistance = stations
            .map(station => {
                const distance = this.calculateDistance(
                    latitude, longitude,
                    station.latitude, station.longitude
                );
                
                return {
                    ...station,
                    distance
                };
            })
            .filter(station => station.distance <= maxDistanceKm)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);

        return stationsWithDistance;
    }

    /**
     * Tìm station gần nhất
     */
    async findNearestStation(latitude, longitude) {
        const nearbyStations = await this.findNearbyStations(latitude, longitude, 1000, 1);
        return nearbyStations.length > 0 ? nearbyStations[0] : null;
    }

    /**
     * Tìm stations trong bounding box
     */
    async findStationsInBounds(northLat, southLat, eastLon, westLon) {
        if (northLat <= southLat || eastLon <= westLon) {
            throw new Error('Invalid bounding box coordinates');
        }

        const stations = await stationRepository.findStationsWithLocation();
        
        return stations.filter(station => {
            return station.latitude >= southLat &&
                   station.latitude <= northLat &&
                   station.longitude >= westLon &&
                   station.longitude <= eastLon;
        });
    }

    /**
     * Tạo bounding box từ center point và radius
     */
    createBoundingBox(centerLat, centerLon, radiusKm) {
        if (!this._isValidCoordinate(centerLat, centerLon)) {
            throw new Error('Invalid center coordinates');
        }

        const latDelta = radiusKm / 111.32; // 1 degree lat ≈ 111.32 km
        const lonDelta = radiusKm / (111.32 * Math.cos(this._toRadians(centerLat)));

        return {
            north: centerLat + latDelta,
            south: centerLat - latDelta,
            east: centerLon + lonDelta,
            west: centerLon - lonDelta
        };
    }

    /**
     * Kiểm tra điểm có trong Việt Nam không
     */
    isInVietnam(latitude, longitude) {
        if (!this._isValidCoordinate(latitude, longitude)) {
            return false;
        }

        return latitude >= this.VIETNAM_BOUNDS.south &&
               latitude <= this.VIETNAM_BOUNDS.north &&
               longitude >= this.VIETNAM_BOUNDS.west &&
               longitude <= this.VIETNAM_BOUNDS.east;
    }

    /**
     * Lấy thống kê địa lý của stations
     */
    async getGeoStatistics() {
        const stations = await stationRepository.findStationsWithLocation();
        
        if (stations.length === 0) {
            return {
                totalStations: 0,
                coverage: null
            };
        }

        const lats = stations.map(s => s.latitude);
        const lons = stations.map(s => s.longitude);

        const bounds = {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lons),
            west: Math.min(...lons)
        };

        const center = {
            latitude: (bounds.north + bounds.south) / 2,
            longitude: (bounds.east + bounds.west) / 2
        };

        // Tính coverage area (rough estimation)
        const coverageArea = this.calculateDistance(
            bounds.north, bounds.west,
            bounds.south, bounds.east
        );

        return {
            totalStations: stations.length,
            bounds,
            center,
            coverageArea: `${Math.round(coverageArea)} km diagonal`,
            stationsPerProvince: this._groupStationsByProvince(stations)
        };
    }

    /**
     * Tính toán cluster stations theo khoảng cách
     */
    async clusterStations(maxClusterDistance = 10) {
        const stations = await stationRepository.findStationsWithLocation();
        const clusters = [];
        const processed = new Set();

        for (const station of stations) {
            if (processed.has(station.hc_uuid)) continue;

            const cluster = {
                center: {
                    latitude: station.latitude,
                    longitude: station.longitude
                },
                stations: [station]
            };

            // Tìm stations khác trong cluster
            for (const otherStation of stations) {
                if (processed.has(otherStation.hc_uuid) || 
                    station.hc_uuid === otherStation.hc_uuid) continue;

                const distance = this.calculateDistance(
                    station.latitude, station.longitude,
                    otherStation.latitude, otherStation.longitude
                );

                if (distance <= maxClusterDistance) {
                    cluster.stations.push(otherStation);
                    processed.add(otherStation.hc_uuid);
                }
            }

            // Cập nhật center của cluster
            if (cluster.stations.length > 1) {
                cluster.center = this._calculateClusterCenter(cluster.stations);
            }

            clusters.push(cluster);
            processed.add(station.hc_uuid);
        }

        return clusters.sort((a, b) => b.stations.length - a.stations.length);
    }

    /**
     * Validate coordinates
     */
    validateCoordinates(latitude, longitude) {
        const errors = [];

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            errors.push('Coordinates must be numbers');
        }

        if (Math.abs(latitude) > 90) {
            errors.push('Latitude must be between -90 and 90');
        }

        if (Math.abs(longitude) > 180) {
            errors.push('Longitude must be between -180 and 180');
        }

        if (!this.isInVietnam(latitude, longitude)) {
            errors.push('Coordinates are outside Vietnam bounds');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Private methods
     */
    _isValidCoordinate(lat, lon) {
        return typeof lat === 'number' && typeof lon === 'number' &&
               Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    }

    _toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    _groupStationsByProvince(stations) {
        const grouped = {};
        
        stations.forEach(station => {
            const province = station.province || 'Unknown';
            if (!grouped[province]) {
                grouped[province] = 0;
            }
            grouped[province]++;
        });

        return grouped;
    }

    _calculateClusterCenter(stations) {
        const totalLat = stations.reduce((sum, s) => sum + s.latitude, 0);
        const totalLon = stations.reduce((sum, s) => sum + s.longitude, 0);
        
        return {
            latitude: totalLat / stations.length,
            longitude: totalLon / stations.length
        };
    }
}

module.exports = new GeoLocationService();