const express = require("express");
const PORT = process.env.PORT || 4040;

const app = express();
app.use(express.json());
app.post("*", async (req, res) => {
  console.log(req.body);
  res.send("Hello post!");
});

app.get("*", async (req, res) => {
  res.send("Hello get!");
});

app.listen(PORT, function () {
  console.log(`Server is listening on port ${PORT}`);
});

// 'https://api.telegram.org/bot<token>/setWebhook?url=<url>'
