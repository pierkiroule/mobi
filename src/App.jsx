import { useState } from "react";
import "./main.css";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <h1>Vite + React</h1>
      <div className="card">
        <button type="button" onClick={() => setCount((value) => value + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  );
}
