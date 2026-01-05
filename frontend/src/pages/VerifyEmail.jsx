import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";

const VerifyEmail = () => {
const hasCalledProvider = useRef(false); 
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Only run if it hasn't been called yet
    if (hasCalledProvider.current) return;
    hasCalledProvider.current = true;

    const verify = async () => {
      const token = searchParams.get("token");
      try {
        const response = await axios.get(`http://localhost:5000/auth/verify-email?token=${token}`);
        setStatus("success");
        setMessage(response.data.message);
      } catch (err) {
        setStatus("error");
        setMessage(err.response?.data?.error || "Verification failed.");
      }
    };
    verify();
  }, [searchParams]);

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      {status === "verifying" && <h2>Verifying your email...</h2>}
      
      {status === "success" && (
        <div>
          <h2 style={{ color: "green" }}>✅ Success!</h2>
          <p>{message}</p>
          <Link to="/login">Go to Login</Link>
        </div>
      )}

      {status === "error" && (
        <div>
          <h2 style={{ color: "red" }}>❌ Verification Failed</h2>
          <p>{message}</p>
          <Link to="/register">Try Registering Again</Link>
        </div>
      )}
    </div>
  );
};

export default VerifyEmail;