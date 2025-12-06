export const teamPipeline = (teamId) => [
    {
        $match: { _id: teamId }
    },
    {
        $lookup: {
            from: "user",
            localField: "head",
            foreignField: "_id",
            as: "head_info",
        }
    },
    {
        $lookup: {
            from: "department",
            localField: "department_id",
            foreignField: "_id",
            as: "department_info",
        }
    },
    {
        $lookup: {
            from: "user",
            localField: "members",
            foreignField: "_id",
            as: "members_info"
        }
    },
    {
        $lookup: {
            from: "complaint",
            localField: "assigned_complaints",
            foreignField: "_id",
            as: "complaints_info"
        }
    },
    {
        $lookup: {
            from: "user",
            localField: "complaints_info.user_id",
            foreignField: "_id",
            as: "reporters"
        }
    },
    {
        $lookup: {
            from: "user",
            localField: "complaints_info.assigned_officer_id",
            foreignField: "_id",
            as: "officers"
        },
    },
    {
        $lookup: {
            from: "escalation",
            localField: "complaints_info.escalation_id",
            foreignField: "_id",
            as: "escalations"
        }
    },
    {
        $addFields: {
            complaints_detailed: {
                $map: {
                    input: "$complaints_info",
                    as: "c",
                    in: {
                        _id: "$$c._id",
                        title: "$$c.title",
                        description: "$$c.description",
                        category: "$$c.category",
                        severity: "$$c.severity",
                        status: "$$c.status",
                        level: "$$c.level",
                        active: "$$c.active",
                        address: "$$c.address",
                        location: "$$c.location",
                        coordinates: "$$c.location.coordinates",
                        upvote: "$$c.upvote",
                        downvote: "$$c.downvote",
                        priority: "$$c.priority",
                        createdAt: "$$c.createdAt",
                        updatedAt: "$$c.updatedAt",

                        reporter: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$reporters",
                                        as: "r",
                                        cond: { $eq: ["$$r._id", "$$c.user._id"] }
                                    }
                                },
                                0
                            ]
                        },
                        
                        assigned_officer: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$escalation",
                                        as: "e",
                                        cond: { $eq: ["$$e._id", "$$c.escalation_id"] }
                                    }
                                },
                                0
                            ]
                        }
                    }
                }
            }
        }
    },

    {
        $addFields: {
            total_members: { $size: "$members_info" },
            total_complaints: { $size: "$complaints_info" },

            pending_count: {
                $size: {
                    $filter: {
                        input: "$complaints_info",
                        as: "c",
                        cond: { $eq: ["$$c.status", "pending"] }
                    }
                }
            },

            in_progress_count: {
                $size: {
                    $filter: {
                        input: "$complaints_info",
                        as: "c",
                        cond: { $eq: ["$$c.status", "in_progress"] }
                    }
                }
            },

            resolved_count: {
                $size: {
                    $filter: {
                        input: "$complaints_info",
                        as: "c",
                        cond: { $eq: ["$$c.status", "resolved"] }
                    }
                }
            },

            rejected_count: {
                $size: {
                    $filter: {
                        input: "$complaints_info",
                        as: "c",
                        cond: { $eq: ["$$c.status", "rejected"] }
                    }
                }
            }
        }
    },

    {
        $project: {
            _id: 1,
            name: 1,
            category: 1,
            team_level: 1,
            department_level: 1,

            head_info: {
                _id: 1,
                name: 1,
                email: 1,
                phone: 1,
                profileImage: 1,
                officer_category: 1,
                user_level: 1,
            },
            department_info: {
                _id: 1,
                name: 1,
                category: 1,
                contact_email: 1,
                contact_phone: 1,
                jurisdiction_level: 1,
            },
            members_info: {
                _id: 1,
                name: 1,
                email: 1,
                phone: 1,
                profileImage: 1,
                officer_category: 1,
                user_level: 1,
                is_active: 1,
            },
            complaints_detailed: 1,
            total_members: 1,
            total_complaints: 1,
            pending_count: 1,
            in_progress_count: 1,
            resolved_count: 1,
            rejected_count: 1,
            createdAt: 1,
            updatedAt: 1,
        }
    }
]