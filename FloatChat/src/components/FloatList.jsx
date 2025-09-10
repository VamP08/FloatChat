import { useEffect, useState } from "react";
import { fetchFloats } from "../api/client";
import { useAppStore } from "../store/appStore";

export default function FloatList() {
  const [floats, setFloats] = useState([]);
  const setFloat = useAppStore((s) => s.setFloat);

  useEffect(() => {
    fetchFloats().then(setFloats);
  }, []);

  return (
    <div className="p-4 border-r h-full overflow-y-auto">
      <h2 className="font-bold mb-2">Floats</h2>
      <ul>
        {floats.map((f) => (
          <li
            key={f.id}
            className="cursor-pointer hover:bg-gray-200 p-1 rounded"
            onClick={() => setFloat(f.id)}
          >
            {f.id} – {f.project_name}
          </li>
        ))}
      </ul>
    </div>
  );
}
