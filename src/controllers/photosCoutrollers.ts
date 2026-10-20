import type { Request, Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddlewares.ts";
import pool from "../db/index.ts";
import cloudinary from "../config/cloudinary.ts";
import { Readable } from "node:stream";

//upload//
export async function uploadPoto (req: AuthRequest, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    message: "Foto wajib diupload!"
                });
            }

            const { title, description } = req.body;

            if (!title || !title.trim()) {
                return res.status(400).json({
                    message: "Judul foto wajib diisi!"
                });
            }

            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "pinterest",
                    resource_type: "image"
                },
                async (error, result) => {
                    if (error || !result) {
                        console.error("Error Cloudinary:", error);

                        return res.status(500).json({
                            message: "Upload ke Cloudinary gagal!"
                        });
                    }

                    try {
                        const [insertResult]: any = await pool.execute(
                            `INSERT INTO photos
                            (user_id, title, description, image_url, public_id)
                            VALUES (?, ?, ?, ?, ?)`,
                            [
                                req.user!.id,
                                title.trim(),
                                description || null,
                                result.secure_url,
                                result.public_id
                            ]
                        );

                        return res.status(201).json({
                            message: "Upload foto berhasil!",
                            data: {
                                id: insertResult.insertId,
                                user_id: req.user!.id,
                                title: title.trim(),
                                description: description || null,
                                image_url: result.secure_url,
                                public_id: result.public_id
                            }
                        });
                    } catch (dbError) {
                        console.error("Error database:", dbError);

                        // Hapus gambar dari Cloudinary jika penyimpanan DB gagal
                        try {
                            await cloudinary.uploader.destroy(
                                result.public_id
                            );
                        } catch (deleteError) {
                            console.error(
                                "Gagal membersihkan Cloudinary:",
                                deleteError
                            );
                        }

                        return res.status(500).json({
                            message: "Gagal menyimpan data foto ke database!"
                        });
                    }
                }
            );

            Readable.from(req.file.buffer).pipe(stream);
        } catch (error) {
            console.error("Error upload:", error);

            return res.status(500).json({
                message: "Internal server error!"
            });
        }
    }

//nampilin semua poto//

export async function nampilinSemuapoto (req: Request, res: Response)  {
    try {
        const [photos]: any = await pool.execute(
            `SELECT
                photos.id,
                photos.user_id,
                users.username,
                photos.title,
                photos.description,
                photos.image_url,
                photos.created_at
            FROM photos
            JOIN users ON photos.user_id = users.id
            ORDER BY photos.created_at DESC`
        );

        return res.status(200).json({
            message: "Berhasil mengambil semua foto!",
            total: photos.length,
            data: photos
        });
    } catch (error) {
        console.error("Error mengambil foto:", error);

        return res.status(500).json({
            message: "Internal server error!"
        });
    }
}

//nampilin semua foto//

export async function nampilinSatuPoto (req: Request, res: Response)  {
    try {
        const id = Number(req.params["id"]);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "ID foto tidak valid!"
            });
        }

        const [photos]: any = await pool.execute(
            `SELECT
                photos.id,
                photos.user_id,
                users.username,
                photos.title,
                photos.description,
                photos.image_url,
                photos.created_at
            FROM photos
            JOIN users ON photos.user_id = users.id
            WHERE photos.id = ?`,
            [id]
        );

        if (photos.length === 0) {
            return res.status(404).json({
                message: "Foto tidak ditemukan!"
            });
        }

        return res.status(200).json({
            message: "Berhasil mengambil detail foto!",
            data: photos[0]
        });

    } catch (error) {
        console.error("Error detail foto:", error);

        return res.status(500).json({
            message: "Internal server error!"
        });
    }
}

//edit deskripsi//

export async function editDeskripsi (req: AuthRequest, res: Response)  {
        try {
            const id = Number(req.params.id);
            const body = req.body ?? {};

            // Validasi ID foto
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: "ID foto tidak valid!"
                });
            }

            const hasTitle = Object.prototype.hasOwnProperty.call(
                body,
                "title"
            );

            const hasDescription = Object.prototype.hasOwnProperty.call(
                body,
                "description"
            );

            // Harus ada data yang ingin diedit
            if (!hasTitle && !hasDescription) {
                return res.status(400).json({
                    message: "Masukkan judul atau deskripsi yang ingin diedit!"
                });
            }

            // Validasi judul
            if (
                hasTitle &&
                (typeof body.title !== "string" ||
                    body.title.trim() === "")
            ) {
                return res.status(400).json({
                    message: "Judul tidak boleh kosong!"
                });
            }

            // Validasi deskripsi
            if (
                hasDescription &&
                body.description !== null &&
                typeof body.description !== "string"
            ) {
                return res.status(400).json({
                    message: "Deskripsi harus berupa teks atau null!"
                });
            }

            // Cari foto di database
            const [photos]: any = await pool.execute(
                `SELECT id, user_id
                 FROM photos
                 WHERE id = ?`,
                [id]
            );

            if (photos.length === 0) {
                return res.status(404).json({
                    message: "Foto tidak ditemukan!"
                });
            }

            const photo = photos[0];

            // Hanya admin atau pemilik foto yang boleh mengedit
            if (
                photo.user_id !== req.user!.id &&
                req.user!.role !== "admin"
            ) {
                return res.status(403).json({
                    message: "Lu tidak punya izin mengedit foto ini!"
                });
            }

            // Susun kolom yang ingin diubah
            const updates: string[] = [];
            const values: (string | number | null)[] = [];

            if (hasTitle) {
                updates.push("title = ?");
                values.push(body.title.trim());
            }

            if (hasDescription) {
                updates.push("description = ?");
                values.push(
                    body.description === null
                        ? null
                        : body.description.trim()
                );
            }

            values.push(id);

            // Update data foto di MySQL
            await pool.execute(
                `UPDATE photos
                 SET ${updates.join(", ")}
                 WHERE id = ?`,
                values
            );

            // Ambil data terbaru
            const [updatedPhotos]: any = await pool.execute(
                `SELECT id, user_id, title, description, image_url, created_at
                 FROM photos
                 WHERE id = ?`,
                [id]
            );

            return res.status(200).json({
                message: "Foto berhasil diedit!",
                data: updatedPhotos[0]
            });
        } catch (error) {
            console.error("Error edit foto:", error);

            return res.status(500).json({
                message: "Internal server error!"
            });
        }
    }

//delet//

export async function deletePoto (req: AuthRequest, res: Response) {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: "ID foto tidak valid!"
                });
            }

            // Cari foto di database
            const [photos]: any = await pool.execute(
                `SELECT id, user_id, public_id
                 FROM photos
                 WHERE id = ?`,
                [id]
            );

            if (photos.length === 0) {
                return res.status(404).json({
                    message: "Foto tidak ditemukan!"
                });
            }

            const photo = photos[0];

            // Periksa pemilik foto atau admin
            if (
                photo.user_id !== req.user!.id &&
                req.user!.role !== "admin"
            ) {
                return res.status(403).json({
                    message: "anda tidak punya izin menghapus foto ini!"
                });
            }

            // Hapus gambar dari Cloudinary
            const result = await cloudinary.uploader.destroy(
                photo.public_id,
                {
                    resource_type: "image"
                }
            );

            if (result.result !== "ok" && result.result !== "not found") {
                return res.status(500).json({
                    message: "Gagal menghapus foto dari Cloudinary!"
                });
            }

            // Hapus data foto dari MySQL
            await pool.execute(
                "DELETE FROM photos WHERE id = ?",
                [id]
            );

            return res.status(200).json({
                message: "Foto berhasil dihapus dari Cloudinary dan MySQL!"
            });

        } catch (error) {
            console.error("Error hapus foto:", error);

            return res.status(500).json({
                message: "Internal server error!"
            });
        }
    }