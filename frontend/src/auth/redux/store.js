import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice.js";
import complaintReducer from "./complaintSlice.js";
import historyReducer from "./historySlice.js";
import officerReducer from "./officerSlice.js";
import notificationReducer from "./notificationSlice.js";
import evidenceReducer from "./evidenceSlice.js";
import departmentReducer from "./departmentSlice.js";
import analyticsReducer from "./analyticsSlice.js";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        complaints: complaintReducer,
        history: historyReducer,
        officer: officerReducer,
        notifications: notificationReducer,
        evidence: evidenceReducer,
        department: departmentReducer,
        analytics: analyticsReducer,
    }
})