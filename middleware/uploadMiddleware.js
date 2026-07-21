import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

let storage;
try {
    storage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: "refund-images",
            allowed_formats: ["jpg", "png", "jpeg"],
        },
    });
} catch (err) {
    storage = multer.memoryStorage();
}

const multerUpload = multer({ storage });

const upload = {
    single: (fieldName) => (req, res, next) => {
        const contentType = req.headers["content-type"] || "";
        if (!contentType.includes("multipart/form-data")) {
            return next();
        }

        multerUpload.single(fieldName)(req, res, (err) => {
            if (err) {
                console.error("Multer upload error:", err);
                if (req.body && req.body.itemPhoto) {
                    return next();
                }
                return res.status(400).json({
                    success: false,
                    message: `Image upload failed: ${err.message}`,
                });
            }
            next();
        });
    },
};

export default upload;