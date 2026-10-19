import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

dotenv.config();

async function seed() {
    const c = await pool.getConnection();

    try {
        // Create users table
        await c.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(40) UNIQUE NOT NULL,
                name VARCHAR(120) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('HOD', 'FACULTY', 'STUDENT') NOT NULL,
                year_level ENUM(
                    'I B.Sc. Computer Science',
                    'II B.Sc. Computer Science',
                    'III B.Sc. Computer Science'
                ) NULL,
                faculty_user_id VARCHAR(40) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (faculty_user_id)
            )
        `);

        // Create leave_requests table
        await c.query(`
            CREATE TABLE IF NOT EXISTS leave_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_user_id VARCHAR(40) NOT NULL,
                faculty_user_id VARCHAR(40) NOT NULL,
                leave_type ENUM(
                    'Medical',
                    'Personal',
                    'Outside Permission',
                    'Other'
                ) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT NOT NULL,
                status ENUM(
                    'Pending',
                    'Approved',
                    'Rejected'
                ) DEFAULT 'Pending',
                faculty_remarks VARCHAR(500) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (student_user_id)
                    REFERENCES users(user_id),

                FOREIGN KEY (faculty_user_id)
                    REFERENCES users(user_id),

                INDEX (faculty_user_id)
            )
        `);

        // Hash the default password
        const hash = await bcrypt.hash('Leave@123', 10);

        // HOD and Faculty accounts
        const accounts = [
            [
                'HOD001',
                'HOD - Computer Science',
                'HOD',
                null,
                null
            ],
            [
                'FAC001',
                'Faculty 1',
                'FACULTY',
                null,
                null
            ],
            [
                'FAC002',
                'Faculty 2',
                'FACULTY',
                null,
                null
            ],
            [
                'FAC003',
                'Faculty 3',
                'FACULTY',
                null,
                null
            ]
        ];

        // Create 30 student accounts
        const years = [
            'I B.Sc. Computer Science',
            'II B.Sc. Computer Science',
            'III B.Sc. Computer Science'
        ];

        for (let y = 1; y <= 3; y++) {
            const year = years[y - 1];

            for (let i = 1; i <= 10; i++) {
                const studentId =
                    `CS${y}-${String(i).padStart(3, '0')}`;

                accounts.push([
                    studentId,
                    `${year} Student ${i}`,
                    'STUDENT',
                    year,
                    `FAC00${y}`
                ]);
            }
        }

        // Insert or update all accounts
        for (const [id, name, role, year, faculty] of accounts) {
            await c.query(
                `
                    INSERT INTO users (
                        user_id,
                        name,
                        password_hash,
                        role,
                        year_level,
                        faculty_user_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?)

                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        password_hash = VALUES(password_hash),
                        role = VALUES(role),
                        year_level = VALUES(year_level),
                        faculty_user_id = VALUES(faculty_user_id)
                `,
                [
                    id,
                    name,
                    hash,
                    role,
                    year,
                    faculty
                ]
            );
        }

        console.log(
            `Seeded ${accounts.length} accounts. ` +
            'Demo password: Leave@123'
        );

    } finally {
        c.release();
        await pool.end();
    }
}

seed().catch((error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
});
