// Enhanced aggregation pipeline for complaints with statistics
export const complaintPipeline = (category) => [
    {
        $match: {
            category: category,
        }
    },
    {
        $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'reporter'
        }
    },
    {
        $lookup: {
            from: 'users',
            localField: 'assigned_officer_id',
            foreignField: '_id',
            as: 'assigned_officer'
        }
    },
    {
        $lookup: {
            from: 'escalations',
            localField: 'escalation_id',
            foreignField: '_id',
            as: 'escalation'
        }
    },
    {
        $unwind: {
            path: '$reporter',
            preserveNullAndEmptyArrays: true
        }
    },
    {
        $unwind: {
            path: '$assigned_officer',
            preserveNullAndEmptyArrays: true
        }
    },
    {
        $unwind: {
            path: '$escalation',
            preserveNullAndEmptyArrays: true
        }
    },
    {
        $project: {
            _id: 1,
            title: 1,
            description: 1,
            category: 1,
            severity: 1,
            status: 1,
            level: 1,
            active: 1,
            address: 1,
            location: 1,
            latitude: 1,
            longitude: 1,
            upvote: 1,
            downvote: 1,
            priority: 1,
            createdAt: 1,
            updatedAt: 1,
            'reporter.name': 1,
            'reporter.email': 1,
            'reporter.profileImage': 1,
            'assigned_officer.name': 1,
            'assigned_officer.email': 1,
            'assigned_officer.profileImage': 1,
            'assigned_officer.officer_category': 1,
            escalation_history: '$escalation.history',
            rejections: 1
        }
    },
    {
        $sort: { createdAt: -1 }
    }
];

// Enhanced aggregation pipeline for officers with their statistics
export const officerPipeline = (category) => [
    {
        $match: {
            role: 'officer',
            officer_category: category,
        }
    },
    {
        $lookup: {
            from: 'complaints',
            let: { officerId: '$_id' },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ['$assigned_officer_id', '$$officerId'] },
                                { $eq: ['$category', category] }
                            ]
                        }
                    }
                }
            ],
            as: 'assigned_complaints'
        }
    },
    {
        $lookup: {
            from: 'departments',
            localField: 'department_id',
            foreignField: '_id',
            as: 'department_info'
        }
    },
    {
        $unwind: {
            path: '$department_info',
            preserveNullAndEmptyArrays: true
        }
    },
    {
        $addFields: {
            total_complaints: { $size: '$assigned_complaints' },
            pending_complaints: {
                $size: {
                    $filter: {
                        input: '$assigned_complaints',
                        as: 'complaint',
                        cond: { $eq: ['$$complaint.status', 'pending'] }
                    }
                }
            },
            in_progress_complaints: {
                $size: {
                    $filter: {
                        input: '$assigned_complaints',
                        as: 'complaint',
                        cond: { $eq: ['$$complaint.status', 'in_progress'] }
                    }
                }
            },
            resolved_complaints: {
                $size: {
                    $filter: {
                        input: '$assigned_complaints',
                        as: 'complaint',
                        cond: { $eq: ['$$complaint.status', 'resolved'] }
                    }
                }
            },
            rejected_complaints: {
                $size: {
                    $filter: {
                        input: '$assigned_complaints',
                        as: 'complaint',
                        cond: { $eq: ['$$complaint.status', 'rejected'] }
                    }
                }
            }
        }
    },
    {
        $project: {
            _id: 1,
            name: 1,
            email: 1,
            phone: 1,
            profileImage: 1,
            officer_category: 1,
            user_level: 1,
            is_active: 1,
            createdAt: 1,
            'department_info.name': 1,
            'department_info.jurisdiction_level': 1,
            total_complaints: 1,
            pending_complaints: 1,
            in_progress_complaints: 1,
            resolved_complaints: 1,
            rejected_complaints: 1,
            latitude: 1,
            longitude: 1,
            address: 1
        }
    },
    {
        $sort: { total_complaints: -1, name: 1 }
    }
];

 // Statistics aggregation pipeline
export const statsPipeline = (category) => [
    {
        $match: {
            category: category,
        }
    },
    {
        $facet: {
            statusCounts: [
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ],
            severityCounts: [
                {
                    $group: {
                        _id: '$severity',
                        count: { $sum: 1 }
                    }
                }
            ],
            levelCounts: [
                {
                    $group: {
                        _id: '$level',
                        count: { $sum: 1 }
                    }
                }
            ],
            totalStats: [
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        activeComplaints: {
                            $sum: { $cond: ['$active', 1, 0] }
                        },
                        avgUpvotes: { $avg: '$upvote' },
                        avgDownvotes: { $avg: '$downvote' }
                    }
                }
            ],
            recentComplaints: [
                { $sort: { createdAt: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        severity: 1,
                        status: 1,
                        level: 1,
                        createdAt: 1
                    }
                }
            ]
        }
    }
];
