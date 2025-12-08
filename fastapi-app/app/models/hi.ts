

import React, { useState, useEffect } from 'react';
const [data, setData] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch('https://api.example.com/data');
      const jsonData = await response.json();
      setData(jsonData);
      console.log(jsonData);
      console.log('Data fetched successfully');

    } catch (error) {
    
      console.error('Error fetching data:', error);
    }
  };


  fetchData();
}, []);





