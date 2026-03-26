import axios from "axios";

export async function getMyGroups() {
   // assuming JWT auth
  const res = await axios.get("http://127.0.0.1:5000/groups/my-groups", {
    headers: {
    },
  });
  return res.data;
}