import "dotenv/config";
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pool from "./db/index.ts";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import upload from "./middlewares/uploadMiddlewares.ts";
import { authMiddleware, type AuthRequest } from "./middlewares/authMiddlewares.ts";
import "./config/cloudinary.ts";
import { deletePoto, editDeskripsi, nampilinSatuPoto, nampilinSemuapoto, uploadPoto } from "./controllers/photosCoutrollers.ts";
import { userRegis, userLogin } from "./controllers/authControllers.ts"; // <-- 2. Import userLogin (sesuaikan dengan nama fungsi login di file authControllers-mu)

const app: Express = express();
const port = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET belum diatur di file .env");
}

// 3. Aktifkan CORS agar Next.js diizinkan mengakses Express
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// REGISTER
app.post("/api/register", userRegis);

// LOGIN (Diperbaiki menggunakan fungsi login, bukan userRegis lagi)
app.post("/api/login", userLogin); 

// UPLOAD FOTO
app.post("/api/upload", authMiddleware, upload.single("image"), uploadPoto);
// GET SEMUA FOTO 
app.get("/api/photos", nampilinSemuapoto);
// GET DETAIL SATU FOTO 
app.get("/api/photos/:id", nampilinSatuPoto);
// edit
app.put("/api/photos/:id", authMiddleware, editDeskripsi);
// delete
app.delete("/api/photos/:id", authMiddleware, deletePoto);

// JALANKAN SERVER
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});