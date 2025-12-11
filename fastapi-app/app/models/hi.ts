
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);

const fetchData = async (url) => {
  setLoading(true);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const jsonData = await response.json();
    setData(jsonData);
  } catch (err) {
    setError(err);
  } finally {
    setLoading(false);
  }
};
