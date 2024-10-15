import { useState } from "react";

export default function HelloWorld({ name }: { name: string }) {
  const [count, setCount] = useState(1);
  return (
    <div>
      <h1>
        Hello {name} x{count}!
      </h1>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Increment
      </button>
    </div>
  );
}
