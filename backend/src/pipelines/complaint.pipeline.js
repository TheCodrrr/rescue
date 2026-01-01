export const complaintByCategoryPipeline = (userLat, userLon, radius) => [
    {
        $match: {
            active: true, 
            location: {
                $geoWithin: {
                    $centerSphere: [
                        [userLon, userLat],
                        radius / 6378100,
                    ]
                }
            }
        }
    },
    {
        $group: {
            _id: "category",
            count: { $sum: 1 },
        }
    },
    {
        $project: {
            _id: 0,
            category: "$_id",
            count: 1,
        }
    }
]