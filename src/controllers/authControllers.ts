
import type { Request, Response } from "express";
import pool from "../db/index.ts";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "pinterest-secret-123";

export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body; 

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Username, Email & Password are required!"
            });
        }

        const [users]: any = await pool.execute(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (users.length > 0) {
            return res.status(400).json({
                message: "Email already registered!"
            });
        }

        await pool.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [username, email, password]
        );

        return res.status(201).json({
            message: "Register success!"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error!"
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email & Password are required!"
            });
        }

        const [users]: any = await pool.execute(
            "SELECT id, username, email, password, role FROM users WHERE email = ?",
            [email]
        );

        if (!users.length) {
            return res.status(401).json({
                message: "Login failed!"
            });
        }

        if (users[0].password !== password) {
            return res.status(401).json({
                message: "Login failed!"
            });
        }

        const token = jwt.sign(
            {
                id: users[0].id,
                username: users[0].username,
                email: users[0].email,
                role: users[0].role
            },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.status(200).json({
            message: "Login success!",
            token: token
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error!"
        });
    }
};

//register//
export async function userRegis (req: Request, res: Response)  {
     try {
            const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Username, Email & Password are required!"
            });
        }

        const [users]: any = await pool.execute(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (users.length > 0) {
            return res.status(400).json({
                message: "Email already registered!"
            });
        }

        await pool.execute(
            `INSERT INTO users (username, email, password)
             VALUES (?, ?, ?)`,
            [username, email, password]
        );

        return res.status(201).json({
            message: "Register success!"
        });
    } catch (error) {
        console.error("Error register:", error);

        return res.status(500).json({
            message: "Internal server error!"
        });
    }
}

//login//

export async function userLogin (req: Request, res: Response)  {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email & Password are required!"
            });
        }

        const [users]: any = await pool.execute(
            `SELECT id, username, email, password, role
             FROM users WHERE email = ?`,
            [email]
        );

        if (!users.length || users[0].password !== password) {
            return res.status(401).json({
                message: "Login failed!"
            });
        }

        const token = jwt.sign(
            {
                id: users[0].id,
                username: users[0].username,
                email: users[0].email,
                role: users[0].role
            },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.status(200).json({
            message: "Login success!",
            token,
            data: {
                id: users[0].id,
                username: users[0].username,
                email: users[0].email,
                role: users[0].role
            }
        });
    } catch (error) {
        console.error("Error login:", error);

        return res.status(500).json({
            message: "Internal server error!"
        });
    }
}