import express from "express";
import {
    createTeam,
    updateTeam,
    getTeamById,
    deleteTeam,
    addMemberToTeam,
    removeMemberFromTeam,
    addComplaintToTeam,
    removeComplaintFromTeam,
    getTeamDetails,
    getTeamByCategory
} from "../controllers/team.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = express.Router();

// CREATE a Team
router.post("/", verifyJWT, createTeam);

// UPDATE a Team
router.put("/:teamId", verifyJWT, updateTeam);

// GET a Team (simple populated version)
router.get("/:teamId", verifyJWT, getTeamById);

// DELETE a Team
router.delete("/:teamId", verifyJWT, deleteTeam);

// ADD member to Team
router.post("/:teamId/add-member", verifyJWT, addMemberToTeam);

// REMOVE member from Team
router.post("/:teamId/remove-member", verifyJWT, removeMemberFromTeam);

// ASSIGN complaint to Team
router.post("/:teamId/add-complaint", verifyJWT, addComplaintToTeam);

// REMOVE complaint from Team
router.post("/:teamId/remove-complaint", verifyJWT, removeComplaintFromTeam);

// GET deep complete structured team details (AGGREGATION)
router.get("/:teamId/details", verifyJWT, getTeamDetails);

// GET team details by category
router.get("/:category/category", verifyJWT, getTeamByCategory);

export default router;