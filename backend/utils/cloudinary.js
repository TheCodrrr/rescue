import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv"
dotenv.config()

// console.log("🔐 Cloudinary config:");
// console.log("CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
// console.log("API_KEY:", process.env.CLOUDINARY_API_KEY);
// console.log("API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "✔️ Loaded" : "❌ Missing");


// Configure cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadOnCloudinary = async function (localFilePath) {
    try {
        if (!localFilePath) return null;
        // console.log(localFilePath);

        // if (fs.existsSync("public/temp/download.png")) {
        //     console.log("✅ File exists before upload");
        // } else {
        //     console.log("❌ File NOT found before upload");
        // }

        const response = await cloudinary.uploader.upload(
            localFilePath,
            {
                resource_type: "auto"
            }
        )
        // console.log(`File uploaded on cloudinary. File src: ${response.url}`)

        // Once the file is uploade on the cloudinary, we need to delete it from our local servers
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
            // console.log("🧹 Local file deleted:", localFilePath);
        }
        return response;
    } catch (error) {
        // console.error("❌ Cloudinary Upload Error:", error);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log("Deleted from cloudinary. Public Id: ", publicId);
    } catch (error) {
        console.log("Error deleting from cloudinary, ", error);
        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary };