import axios from "axios";

export async function getMyGroups() {
   // assuming JWT auth
  const res = await axios.get("http://localhost:5000/groups/my-groups", {
    withCredentials: true,
  });
  return res.data;
}