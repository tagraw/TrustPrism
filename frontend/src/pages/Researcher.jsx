import { useEffect, useState } from "react";
import { getMyGroups } from "../api/groups";

export default function Researcher() {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const data = await getMyGroups();
        setGroups(data);
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      }
    }
    fetchGroups();
  }, []);

  return (
    <div>
      <h1>Researcher Dashboard</h1>

      {groups.length > 0 ? (
        <div>
          <h2>Your Groups</h2>
          <ul>
            {groups.map((g) => (
              <li key={g.id}>
                {g.name} (ID: {g.id})
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>You are not in any groups yet.</p>
      )}
    </div>
  );
}
