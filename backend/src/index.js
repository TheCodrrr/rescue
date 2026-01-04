import dotenv from "dotenv";
import { server } from "./server.js";
import connectDB from "./db/index.js";
dotenv.config({
    path: "./.env"
})

const PORT = process.env.PORT || 5000

connectDB()
.then(() => {
    server.listen(PORT, () => {
        // console.log(`server with sockets is saambding on port ${PORT}`)
    })
})
.catch((err) => {
    // console.log("MongoDB connection error: ", err)
});