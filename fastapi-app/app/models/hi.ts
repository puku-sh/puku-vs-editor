

const [loading, setLoading] = useState(false);
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    await axios.post('/api/submit', formData);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};