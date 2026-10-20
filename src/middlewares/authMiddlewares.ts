
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET belum diatur di .env");
    }

    return secret;
}

export interface AuthRequest extends Request {
    user?: {
        id: number;
        username: string;
        email: string;
        role: string;
    };
}

export function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Token tidak ditemukan!"
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Token tidak ditemukan!"
        });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());

        if (
            typeof decoded === "string" ||
            typeof decoded.id !== "number" ||
            typeof decoded.username !== "string" ||
            typeof decoded.email !== "string" ||
            typeof decoded.role !== "string"
        ) {
            return res.status(401).json({
                message: "Token tidak valid!"
            });
        }

        req.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role
        };

        return next();
    } catch (error) {
        if (error instanceof Error && error.message.includes("JWT_SECRET")) {
            console.error(error.message);

            return res.status(500).json({
                message: "Konfigurasi JWT_SECRET bermasalah!"
            });
        }

        return res.status(401).json({
            message: "Token tidak valid atau sudah kedaluwarsa!"
        });
    }
}
