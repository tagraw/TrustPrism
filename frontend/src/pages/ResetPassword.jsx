import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const token = searchParams.get("token"); // Extract token from URL
    console.log("Submitting Token:", token);
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    //  Client-side validation for matching passwords
    if (password !== confirmPassword) {
      return setMessage("Passwords do not match.");
    }

    try {
      await axios.post("http://localhost:5000/auth/reset-password", {
        token: token,
        newPassword: password
      });
      setMessage("Password reset successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || "Reset failed. Link may be expired.");
    }
  };

  return (
    <div className="auth-container">
      <h2>Set New Password</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="password" 
          placeholder="New Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          minLength="8" // Basic security enforcement
        />
        <input 
          type="password" 
          placeholder="Confirm New Password" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          required 
        />
        <button type="submit">Update Password</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default ResetPassword;