# E-Leave: HOD + 3 Faculty + 30 Students
React/Vite frontend, Express backend, MySQL database.

## Setup
1. Install Node.js LTS and MySQL 8.
2. In MySQL Workbench, run `database_setup.sql` first. Create `backend/.env` using `backend/.env.example`; set your database host, port, username, password, database name, and a long random `JWT_SECRET`. For Aiven, enable `DB_SSL=true` and configure its CA certificate when required. Never commit `.env` or share passwords.
3. In terminal: `cd backend`, `npm install`, `npm run seed`, `npm run dev`.
4. In a second terminal: `cd frontend`, `npm install`, `npm run dev`.
5. Open http://localhost:5173.

## Deployment configuration
- Render backend: set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`, `JWT_SECRET`, and `CLIENT_URL` in Environment. Use the hostname/port shown by your MySQL provider; for Aiven, allow public access from the backend and configure its CA certificate if TLS verification requires it.
- Vercel frontend: set `VITE_API_URL=https://your-render-service.onrender.com/api`, then redeploy the frontend.
- The backend requires `JWT_SECRET` in production. Attendance counts a student as absent only when they have an Approved leave covering the current date in India time.

## Demo accounts
All seeded accounts use password `Leave@123`.
- HOD: `HOD001`
- Faculty: `FAC001`, `FAC002`, `FAC003`
- I B.Sc CS students: `CS1-001` to `CS1-010` → FAC001
- II B.Sc CS students: `CS2-001` to `CS2-010` → FAC002
- III B.Sc CS students: `CS3-001` to `CS3-010` → FAC003

Faculty can review only their assigned students' requests. HOD sees all students, all three faculty workloads, year-wise totals, all leave requests, and today’s present/on-approved-leave totals. Students on an approved leave covering today count as absent; all other seeded students count as present. HOD cannot approve/reject. Student requests are automatically sent to the assigned faculty by the backend. Change demo passwords before using real data. Running `npm run seed` again resets demo account passwords and names.
