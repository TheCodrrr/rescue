import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice.js";
import complaintReducer from "./complaintSlice.js";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        complaints: complaintReducer,
    }
})