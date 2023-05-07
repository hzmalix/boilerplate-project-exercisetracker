const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

mongoose.connect(process.env.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  const { username } = req.body;

  try {
    const user = new User({ username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, { __v: 0 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;
  const exerciseDate = date ? new Date(date) : new Date();

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ error: "User not found" });
    }

    const exercise = new Exercise({
      description,
      duration,
      date: exerciseDate.toDateString(),
      userId,
    });

    await exercise.save();

    user.count += 1;
    user.log = user.log || [];
    user.log.push(exercise);
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      duration: exercise.duration,
      description: exercise.description,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ error: "User not found" });
    }

    let exercises = await Exercise.find({ userId });
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      exercises = exercises.filter((exercise) => {
        const exerciseDate = new Date(exercise.date);
        return exerciseDate >= fromDate && exerciseDate <= toDate;
      });
    }
    if (limit) {
      exercises = exercises.slice(0, limit);
    }

    const log = exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
