import axios from "axios";

export async function getMyGroups() {
  const token = localStorage.getItem("token"); // assuming JWT auth
  const res = await axios.get("http://127.0.0.1:5000/groups/my-groups", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}