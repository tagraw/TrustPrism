import { useState } from "react";
import axios from "axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        await axios.post("http://localhost:5000/auth/forgot-password", { email });
        setMessage("If an account exists with that email, a reset link has been sent.");
    } catch (err) {
        // Log the error to use the variable and aid debugging
        console.error("Forgot password error:", err); 
        setMessage("An error occurred. Please try again later.");
    }
 };

  return (
    <div className="auth-container">
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="email" 
          placeholder="Enter your email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <button type="submit">Send Reset Link</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default ForgotPassword;