const express = require('express');
const app = express();

const PORT = process.env.PORT || 1000;

app.get('/', (req, res) => {
  res.send('Hello PM2 - <a href="http://localhost:3000/">PM2 Documentation</a>');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
