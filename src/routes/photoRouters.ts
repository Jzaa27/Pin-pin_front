import { Router } from "express";
import { 
    uploadPoto, 
    nampilinSemuapoto, 
    nampilinSatuPoto, 
    editDeskripsi, 
    deletePoto 
} from "../controllers/photosCoutrollers.ts"; // Sesuaikan dengan nama file controller kamu
import { authMiddleware } from "../middlewares/authMiddlewares.ts";
import upload from "../middlewares/uploadMiddlewares.ts";

const router = Router();

// Rute Publik (Bisa diakses tanpa login)
router.get("/photos", nampilinSemuapoto);
router.get("/photos/:id", nampilinSatuPoto);

// Rute Terproteksi (Harus login / membawa token JWT)
router.post("/upload", authMiddleware, upload.single("image"), uploadPoto);
router.put("/photos/:id", authMiddleware, editDeskripsi);   // Edit judul/deskripsi foto
router.delete("/photos/:id", authMiddleware, deletePoto); // Hapus foto

export default router;