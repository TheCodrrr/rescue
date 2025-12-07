export const officersByCategoryPipeline = (category, latitude, longitude, skip, limit) => {
    const pipeline = [
        {
            $match: {
                role: "officer",
                officer_category: category
            }
        }
    ];

    // If latitude and longitude are provided, add distance calculation
    if (latitude && longitude) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const toRadians = Math.PI / 180;

        // Add distance field using aggregation (Haversine formula)
        pipeline.push({
            $addFields: {
                distance: {
                    $cond: {
                        if: {
                            $and: [
                                { $ne: ["$latitude", null] },
                                { $ne: ["$longitude", null] }
                            ]
                        },
                        then: {
                            $let: {
                                vars: {
                                    dLat: { $multiply: [{ $subtract: ["$latitude", lat] }, toRadians] },
                                    dLon: { $multiply: [{ $subtract: ["$longitude", lng] }, toRadians] },
                                    lat1: { $multiply: [lat, toRadians] },
                                    lat2: { $multiply: ["$latitude", toRadians] }
                                },
                                in: {
                                    $multiply: [
                                        6371,
                                        {
                                            $multiply: [
                                                2,
                                                {
                                                    $asin: {
                                                        $sqrt: {
                                                            $add: [
                                                                { $pow: [{ $sin: { $divide: ["$$dLat", 2] } }, 2] },
                                                                {
                                                                    $multiply: [
                                                                        { $cos: "$$lat1" },
                                                                        { $cos: "$$lat2" },
                                                                        { $pow: [{ $sin: { $divide: ["$$dLon", 2] } }, 2] }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        },
                        else: 999999
                    }
                }
            }
        });

        // Filter by 200km radius (or include those without location)
        pipeline.push({
            $match: {
                $or: [
                    { distance: { $lte: 200 } },
                    { latitude: null },
                    { longitude: null }
                ]
            }
        });
    }

    // Add sorting
    pipeline.push({
        $sort: { user_level: -1, name: 1 }
    });

    // Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Add projection (select fields)
    pipeline.push({
        $project: {
            name: 1,
            email: 1,
            phone: 1,
            officer_category: 1,
            user_level: 1,
            department_id: 1,
            is_active: 1,
            profileImage: 1,
            latitude: 1,
            longitude: 1,
            address: 1,
            distance: 1
        }
    });

    return pipeline;
};
