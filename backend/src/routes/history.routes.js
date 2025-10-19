import express from "express";
import {
    addHistory,
    deleteHistory,
    getHistory,
    clearUserHistory
} from "../controllers/history.controllers.js"

const router = express.Router();

router.post("/", addHistory);
router.get("/", getHistory);
router.delete("/:id", deleteHistory);
router.delete("/user/:user_id", clearUserHistory);

export default router;