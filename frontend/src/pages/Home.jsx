import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <h1>Welcome</h1>

      <Link to="/login">
        <button>Login</button>
      </Link>

      <Link to="/register">
        <button>Sign Up</button>
      </Link>
    </div>
  );
}