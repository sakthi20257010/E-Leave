
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = (import.meta.env.PROD ? "https://e-leave.onrender.com/api" : (import.meta.env.VITE_API_URL || "http://localhost:5000/api")).replace(/\/$/, "");

async function api(path, token, opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const contentType = r.headers.get("content-type") || "";
  const d = contentType.includes("application/json")
    ? await r.json()
    : { message: `Server returned HTTP ${r.status}. Check API URL and backend deployment.` };

  if (!r.ok) throw Error(d.message || "Request failed");

  return d;
}

function App() {
  const [token, T] = useState(localStorage.getItem("tok") || "");
  const [user, U] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const [id, I] = useState("");
  const [pw, P] = useState("");
  const [err, E] = useState("");
  const [msg, M] = useState("");

  const [data, D] = useState(null);
  const [mine, N] = useState([]);
  const [fac, F] = useState(null);

  const [type, Y] = useState("Medical");
  const [start, S] = useState("");
  const [end, Z] = useState("");
  const [reason, R] = useState("");
  const [remarks, Q] = useState({});

  const [filter, G] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");

  // Reference to the Leave Requests section
  const leaveRequestsRef = useRef(null);

  const yearOptions = [
    "I B.Sc. Computer Science",
    "II B.Sc. Computer Science",
    "III B.Sc. Computer Science",
  ];

  async function refresh(u = user, t = token) {
    if (!u || !t) return;

    try {
      E("");

      if (u.role === "HOD") {
        D(await api("/hod/dashboard", t));
      } else if (u.role === "FACULTY") {
        N(await api("/faculty/requests", t));
      } else {
        N(await api("/leaves/mine", t));
        F((await api("/students/faculty", t)).faculty);
      }
    } catch (e) {
      E(e.message);
    }
  }

  useEffect(() => {
    if (token && user) refresh(user, token);
  }, []);

  // Select a year and smoothly scroll to Leave Requests
  function viewYear(year) {
    setYearFilter(year);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        leaveRequestsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }

  async function login(e) {
    e.preventDefault();

    try {
      E("");

      const d = await api("/auth/login", null, {
        method: "POST",
        body: JSON.stringify({
          user_id: id,
          password: pw,
        }),
      });

      T(d.token);
      U(d.user);

      localStorage.setItem("tok", d.token);
      localStorage.setItem("user", JSON.stringify(d.user));

      await refresh(d.user, d.token);
    } catch (e) {
      E(e.message);
    }
  }

  function logout() {
    T("");
    U(null);
    D(null);
    N([]);
    F(null);

    localStorage.removeItem("tok");
    localStorage.removeItem("user");
  }

  async function apply(e) {
    e.preventDefault();

    try {
      E("");
      M("");

      if (end < start) {
        E("End date must be on or after the start date.");
        return;
      }

      const d = await api("/leaves", token, {
        method: "POST",
        body: JSON.stringify({
          leave_type: type,
          start_date: start,
          end_date: end,
          reason,
        }),
      });

      M(d.message);
      R("");
      S("");
      Z("");

      await refresh();
    } catch (e) {
      E(e.message);
    }
  }

  async function decide(requestId, status) {
    try {
      E("");
      M("");

      const d = await api(
        "/faculty/requests/" + requestId,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            faculty_remarks: remarks[requestId] || "",
          }),
        }
      );

      M(d.message);
      await refresh();
    } catch (e) {
      E(e.message);
    }
  }

  if (!token || !user) {
    return (
      <div className="login">
        <form onSubmit={login}>
          <div className="mark">EL</div>

          <p className="tag">
            COMPUTER SCIENCE · DEPARTMENT
          </p>

          <h1>E-Leave Portal</h1>

          <p className="sub">
            Sign in with your college user ID.
          </p>

          <label>User ID</label>
          <input
            value={id}
            onChange={(e) => I(e.target.value)}
            placeholder="e.g. CS1-001"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => P(e.target.value)}
            placeholder="Enter password"
            required
          />

          <button type="submit">Sign in</button>

          {err && <p className="error">{err}</p>}

          <small>Use your assigned login credentials.</small>
        </form>
      </div>
    );
  }

  const hodRequests =
    data?.requests?.filter(
      (x) =>
        (yearFilter === "All" ||
          x.year_level === yearFilter) &&
        (filter === "All" || x.status === filter)
    ) || [];

  const hodStudents =
    data?.students?.filter(
      (s) =>
        yearFilter === "All" ||
        s.year_level === yearFilter
    ) || [];

  const countYearStatus = (status) =>
    (data?.requests || []).filter(
      (x) =>
        (yearFilter === "All" ||
          x.year_level === yearFilter) &&
        (status === "All" || x.status === status) &&
        (filter === "All" || x.status === filter)
    ).length;

  return (
    <>
      <header>
        <div>
          <b>EL · E-Leave</b>
          <small>Computer Science Department</small>
        </div>

        <div className="profile">
          {user.name} · {user.user_id}

          <button className="out" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main>
        <div className="heading">
          <div>
            <p className="tag">
              DASHBOARD / {user.role}
            </p>

            <h1>
              {user.role === "HOD"
                ? "Department overview"
                : user.role === "FACULTY"
                  ? "Faculty requests"
                  : "Student leave portal"}
            </h1>

            <p className="sub">
              {user.year_level ||
                "Monitor leave requests and approvals"}
            </p>
          </div>

          <button
            className="light"
            onClick={() => refresh()}
          >
            Refresh
          </button>
        </div>

        {err && <p className="alert error">{err}</p>}
        {msg && <p className="alert">{msg}</p>}

        {/* STUDENT DASHBOARD */}
        {user.role === "STUDENT" && (
          <>
            <div className="cols">
              <section className="card">
                <h2>Apply for leave</h2>

                <p className="sub">
                  Your request is sent only to your assigned faculty.
                </p>

                <div className="assigned">
                  <span>Assigned faculty</span>
                  <b>{fac?.name || user.faculty_user_id}</b>
                </div>

                <form onSubmit={apply} className="fields">
                  <label>
                    Leave type
                    <select
                      value={type}
                      onChange={(e) => Y(e.target.value)}
                    >
                      <option>Medical</option>
                      <option>Personal</option>
                      <option>Outside Permission</option>
                      <option>Other</option>
                    </select>
                  </label>

                  <label>
                    From
                    <input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={start}
                      onChange={(e) => {
                        S(e.target.value);

                        if (end && end < e.target.value) {
                          Z("");
                        }
                      }}
                      required
                    />
                  </label>

                  <label>
                    To
                    <input
                      type="date"
                      min={start || new Date().toISOString().slice(0, 10)}
                      value={end}
                      onChange={(e) => Z(e.target.value)}
                      required
                    />
                  </label>

                  <label className="wide">
                    Reason
                    <textarea
                      value={reason}
                      onChange={(e) => R(e.target.value)}
                      required
                      rows="3"
                      placeholder="Enter your leave reason"
                    />
                  </label>

                  <button className="wide" type="submit">
                    Send request
                  </button>
                </form>
              </section>

              <section className="card">
                <h2>My latest request</h2>

                {mine[0] ? (
                  <Request r={mine[0]} />
                ) : (
                  <p className="sub">No requests yet.</p>
                )}
              </section>
            </div>

            <section className="card">
              <h2>My leave history ({mine.length})</h2>
              <Table rows={mine} />
            </section>
          </>
        )}

        {/* FACULTY DASHBOARD */}
        {user.role === "FACULTY" && (
          <>
            <div className="metrics">
              <Metric title="Requests" n={mine.length} />

              <Metric
                title="Pending"
                n={mine.filter(
                  (x) => x.status === "Pending"
                ).length}
              />

              <Metric
                title="Approved"
                n={mine.filter(
                  (x) => x.status === "Approved"
                ).length}
              />

              <Metric
                title="Rejected"
                n={mine.filter(
                  (x) => x.status === "Rejected"
                ).length}
              />
            </div>

            <section className="card">
              <h2>Requests assigned to you</h2>

              <Table
                rows={mine}
                faculty
                decide={decide}
                remarks={remarks}
                setRemarks={Q}
              />
            </section>
          </>
        )}

        {/* HOD DASHBOARD */}
        {user.role === "HOD" && (
          data ? (
            <>
              <div className="metrics">
                {Object.entries(data.counts || {}).map(
                  ([k, v]) => (
                    <Metric
                      key={k}
                      title={k.replaceAll("_", " ")}
                      n={v}
                    />
                  )
                )}
              </div>

              {/* TODAY'S ATTENDANCE */}
              <section className="card">
                <p className="tag">ATTENDANCE OVERVIEW</p>
                <h2>Today's attendance</h2>
                <p className="sub">
                  {data.attendance?.date || "Today"} · Students with an approved leave covering today count as absent.
                </p>
                <div className="metrics">
                  <Metric title="Present" n={data.attendance?.present ?? 0} />
                  <Metric title="Absent on approved leave" n={data.attendance?.absent ?? 0} />
                  <Metric title="Total students" n={data.attendance?.total_students ?? 0} />
                </div>
                <h3>Year-wise attendance</h3>
                <div className="faculty">
                  {(data.attendance?.by_year || []).map((y) => (
                    <article key={y.year_level}>
                      <b>{y.year_level}</b>
                      <p>{y.present} present</p>
                      <p>{y.absent} absent</p>
                      <small>{y.total_students} students total</small>
                    </article>
                  ))}
                </div>
              </section>

              {/* FACULTY WORKLOAD */}
              <section className="card">
                <h2>Faculty workload</h2>

                <div className="faculty">
                  {(data.faculty || []).map((f) => (
                    <article key={f.user_id}>
                      <b>{f.name}</b>
                      <small>{f.user_id}</small>

                      <p>{f.student_count} students</p>

                      <p>
                        {f.request_count} requests ·{" "}
                        {f.pending_count || 0} pending
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              {/* YEAR-WISE STUDENT TOTALS */}
              <section className="card">
                <h2>Year-wise student totals</h2>

                <div className="faculty">
                  {(data.years || []).map((y) => (
                    <article key={y.year_level}>
                      <b>{y.year_level}</b>
                      <h2>{y.student_count}</h2>
                      <small>Students</small>

                      <button
                        className="light"
                        onClick={() => viewYear(y.year_level)}
                      >
                        View year
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              {/* LEAVE REQUESTS - SCROLL TARGET */}
              <section
                className="card year-wise-requests"
                ref={leaveRequestsRef}
              >
                <p className="tag">YEAR-WISE MANAGEMENT</p>
                <h2>Leave Requests</h2>

                <p className="sub">
                  Select a year to see its leave requests.
                </p>

                <div className="row">
                  <h3>
                    {yearFilter === "All"
                      ? "All Years"
                      : yearFilter}
                  </h3>

                  
                </div>

                <div className="metrics">
                  <Metric
                    title="Total Requests"
                    n={countYearStatus("All")}
                  />

                  <Metric
                    title="Pending"
                    n={countYearStatus("Pending")}
                  />

                  <Metric
                    title="Approved"
                    n={countYearStatus("Approved")}
                  />

                  <Metric
                    title="Rejected"
                    n={countYearStatus("Rejected")}
                  />
                </div>

                <Table rows={hodRequests} hod />
              </section>

              {/* YEAR-WISE STUDENT LIST */}
              <section className="card">
                <div className="row">
                  <h2>Students ({hodStudents.length})</h2>

                  <select
                    className="filter"
                    value={yearFilter}
                    onChange={(e) =>
                      setYearFilter(e.target.value)
                    }
                  >
                    <option value="All">All Students</option>

                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Name</th>
                        <th>Year</th>
                        <th>Faculty</th>
                      </tr>
                    </thead>

                    <tbody>
                      {hodStudents.map((s) => (
                        <tr key={s.user_id}>
                          <td>{s.user_id}</td>
                          <td>{s.name}</td>
                          <td>{s.year_level}</td>
                          <td>{s.faculty_user_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!hodStudents.length && (
                    <p className="sub">
                      No students found for this year.
                    </p>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="card">
              <p className="sub">
                Loading HOD dashboard...
              </p>
            </section>
          )
        )}

        <footer>
          Computer Science Department · E-Leave System
        </footer>
      </main>
    </>
  );
}

function Metric({ title, n }) {
  return (
    <div className="metric">
      <small>{title}</small>
      <b>{n}</b>
    </div>
  );
}

function Request({ r }) {
  return (
    <div className="request">
      <b>{r.leave_type}</b>

      <span className={"status " + r.status}>
        {r.status}
      </span>

      <p>
        {String(r.start_date).slice(0, 10)} →{" "}
        {String(r.end_date).slice(0, 10)}
      </p>

      <p>{r.reason}</p>

      {r.faculty_remarks && (
        <p className="sub">
          Faculty remarks: {r.faculty_remarks}
        </p>
      )}
    </div>
  );
}

function Table({
  rows = [],
  faculty = false,
  hod = false,
  decide,
  remarks = {},
  setRemarks,
}) {
  if (!rows.length) {
    return (
      <p className="sub">
        No leave requests to display.
      </p>
    );
  }

  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            {(hod
              ? ["Student", "Year", "Faculty"]
              : faculty
                ? ["Student", "Year"]
                : []
            ).map((x) => (
              <th key={x}>{x}</th>
            ))}

            <th>Type</th>
            <th>Dates</th>
            <th>Reason</th>
            <th>Status</th>

            {faculty && <th>Decision</th>}
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {(hod
                ? [
                    r.student_name,
                    r.year_level,
                    r.faculty_name,
                  ]
                : faculty
                  ? [r.student_name, r.year_level]
                  : []
              ).map((x, i) => (
                <td key={i}>{x}</td>
              ))}

              <td>{r.leave_type}</td>

              <td>
                {String(r.start_date).slice(0, 10)}
                <br />
                → {String(r.end_date).slice(0, 10)}
              </td>

              <td>
                {r.reason}

                {r.faculty_remarks && (
                  <p className="sub">
                    Remarks: {r.faculty_remarks}
                  </p>
                )}
              </td>

              <td>
                <span className={"status " + r.status}>
                  {r.status}
                </span>
              </td>

              {faculty && (
                <td>
                  {r.status === "Pending" ? (
                    <div className="decisions">
                      <input
                        placeholder="Optional remarks"
                        value={remarks[r.id] || ""}
                        onChange={(e) =>
                          setRemarks((p) => ({
                            ...p,
                            [r.id]: e.target.value,
                          }))
                        }
                      />

                      <button
                        className="approve"
                        onClick={() =>
                          decide(r.id, "Approved")
                        }
                      >
                        Approve
                      </button>

                      <button
                        className="reject"
                        onClick={() =>
                          decide(r.id, "Rejected")
                        }
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    "Processed"
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
