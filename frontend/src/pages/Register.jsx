import { useState } from "react";
import { register } from "../api/auth";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("user");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    dob: "",
    password: "",
    groupId: "",
    createGroupName: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const res = await register({
        ...form,
        role,
      });

      // Save token/role if your backend returns it
      if (res.token) localStorage.setItem("token", res.token);
      localStorage.setItem("role", role); // store role locally

      // Redirect based on role
      if (role === "researcher") {
        navigate("/researcher");
      } else if (role === "user") {
        navigate("/user");
      }
      // Optional message
      if (res.createdGroup) {
        setMessage(`Account created. New Group ID: ${res.createdGroup}`);
      } else {
        setMessage("Account created successfully");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Sign Up</h2>

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="user">User</option>
        <option value="researcher">Researcher</option>
      </select>

      <input name="first_name" placeholder="First name" onChange={update} required/>
      <input name="last_name" placeholder="Last name" onChange={update} required/>
      <input name="email" placeholder="Email" onChange={update} required/>
      <input type="password" name="password" placeholder="Password" onChange={update} required/>

      {role === "user" && (
        <input type="date" name="dob" onChange={update} required/>
      )}

      {role === "researcher" && (
        <>
          <input
            name="groupId"
            placeholder="Join Group ID (optional)"
            onChange={update}
          />
          <input
            name="createGroupName"
            placeholder="Or Create New Group"
            onChange={update}
          />
        </>
      )}

      <button type="submit">Sign Up</button>
      <p>Already have an account?</p>
      <Link to="/login">
        <button>Login</button>
      </Link>


      {error && <p style={{ color: "red" }}>{error}</p>}
      {message && <p>{message}</p>}
    </form>
  );
}
