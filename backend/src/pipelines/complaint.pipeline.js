export const complaintByCategoryPipeline = (userLat, userLon, radius) => [
    {
        $match: {
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
            _id: "$category",
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

export const complaintByDate = () => {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    return [
        {
            $match: {
                createdAt: { $gte: twoMonthsAgo }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                count: { $sum: 1 },
            }
        },
        {
            $project: {
                _id: 0,
                date: "$_id",
                count: 1,
            }
        },
        { $sort: { date: 1 } },
    ]
}