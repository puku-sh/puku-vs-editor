const App = () => {
  const [count, setCount] = useState(0);
  
  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, "Hello, World!"),
    React.createElement("p", null, `Count: ${count}`),
    React.createElement(
      "button",
      { onClick: () => setCount(count + 1) },
      "Increment"
    )
  );
};

