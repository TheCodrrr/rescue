import dotenv from "dotenv";
import { app } from "./server.js";
import connectDB from "./db/index.js";
dotenv.config({
    path: "./.env"
})

const PORT = process.env.PORT || 5000

connectDB()
.then(() => {
    app.listen(PORT, () => {
        console.log(`server is saambding on port ${PORT}`)
    })
})
.catch((err) => console.log("MongoDB connection error: ", err));