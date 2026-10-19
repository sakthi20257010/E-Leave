# E-Leave: HOD + 3 Faculty + 30 Students
React/Vite frontend, Express backend, MySQL database.

## Setup
1. Install Node.js LTS and MySQL 8.
2. In MySQL Workbench, run `database_setup.sql` first. Copy `backend/.env.example` to `backend/.env`; set your MySQL password and a strong JWT secret.
3. In terminal: `cd backend`, `npm install`, `npm run seed`, `npm run dev`.
4. In a second terminal: `cd frontend`, `npm install`, `npm run dev`.
5. Open http://localhost:5173.

## Demo accounts
All seeded accounts use password `Leave@123`.
- HOD: `HOD001`
- Faculty: `FAC001`, `FAC002`, `FAC003`
- I B.Sc CS students: `CS1-001` to `CS1-010` → FAC001
- II B.Sc CS students: `CS2-001` to `CS2-010` → FAC002
- III B.Sc CS students: `CS3-001` to `CS3-010` → FAC003

Faculty can review only their assigned students' requests. HOD sees all students, all three faculty workloads, year-wise totals, all leave requests, and today’s present/on-approved-leave totals. Students on an approved leave covering today count as absent; all other seeded students count as present. HOD cannot approve/reject. Student requests are automatically sent to the assigned faculty by the backend. Change demo passwords before using real data. Running `npm run seed` again resets demo account passwords and names.
