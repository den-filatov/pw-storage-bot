const mongoose = require("mongoose");
const { User } = require("./models");
const { Telegraf } = require("telegraf");
const { BOT_TOKEN } = require("./config");
const { crypto } = require("./utils");

const bot = new Telegraf(BOT_TOKEN);
const action_sequence = [];
const commands = [
  { command: "/set", description: "set password to list" },
  { command: "/get", description: "get password from list" },
  { command: "/del", description: "delete password from list" },
  { command: "/list", description: "show list of services" },
  { command: "/reset", description: "reset account (clear all)" },
];

bot.start(async (ctx) => {
  await ctx.reply(
    "Hi, Human 👋\n" +
      "I will help you save all passwords 🔮\n" +
      "Use /help for more information 📚"
  );
  await ctx.setMyCommands(commands);
  if (!(await User.exists({ user_id: ctx.from.id }))) {
    const user = new User();
    user.user_id = ctx.from.id;
    user.first_name = ctx.from.first_name;
    user.last_name = ctx.from.last_name;
    user.username = ctx.from.username;
    user.is_bot = ctx.from.is_bot;
    user.global_password = "";
    user.services = new Map();
    await user.save();
  }
});

bot.help(async (ctx) => {
  const mes = commands.reduce(
    (acc, cur) => `${acc}\n⚙️ ${cur.command} - ${cur.description}`,
    "I can do the following:"
  );
  await ctx.reply(mes);
});

bot.command("set", async (ctx) => {
  await ctx.reply("Send global password:");
  action_sequence.push({ type: "set@step-1" });
});

bot.command("get", async (ctx) => {
  await ctx.reply("Send global password:");
  action_sequence.push({ type: "get@step-1" });
});

bot.command("del", async (ctx) => {
  await ctx.reply("Send service name:");
  action_sequence.push({ type: "del@step-1" });
});

bot.command("list", async (ctx) => {
  const user = await User.findOne({ user_id: ctx.from.id });
  const services = Array.from(user.services.keys());
  if (services.length) {
    const mes = services.reduce(
      (acc, cur, ind) => `${acc}\n${ind + 1}) ${cur}`,
      "The following services have been added:"
    );
    await ctx.reply(mes);
  } else {
    await ctx.reply("Services have not been added 🥁");
  }
});

bot.command("reset", async (ctx) => {
  await ctx.reply("Are you sure (yes / no)? All data will be deleted!");
  action_sequence.push({ type: "reset@step-1" });
});

bot.command("log", async (ctx) => {
  const users = await User.find({});
  console.log(users);
});

bot.on("text", async (ctx) => {
  const action = action_sequence.shift() || {};
  switch (action.type) {
    case "set@step-1": {
      const user = await User.findOne({ user_id: ctx.from.id });
      if (!user.global_password) {
        user.global_password = crypto.hash(ctx.message.text);
        await user.save();
      } else if (user.global_password !== crypto.hash(ctx.message.text)) {
        await ctx.reply("Invalid password 🚧");
        break;
      }
      await ctx.reply("Send service name:");
      action_sequence.push({
        type: "set@step-2",
        data: { global_password: ctx.message.text },
      });
      break;
    }
    case "set@step-2": {
      await ctx.reply("Send service password:");
      action_sequence.push({
        type: "set@step-3",
        data: { ...action.data, service_name: ctx.message.text },
      });
      break;
    }
    case "set@step-3": {
      const user = await User.findOne({ user_id: ctx.from.id });
      const encrypted_password = crypto.encrypt(
        ctx.message.text,
        action.data.global_password
      );
      user.services.set(action.data.service_name, encrypted_password);
      await user.save();
      await ctx.reply("Entry added successfully 🎉");
      break;
    }
    case "get@step-1": {
      const user = await User.findOne({ user_id: ctx.from.id });
      if (user.global_password === crypto.hash(ctx.message.text)) {
        await ctx.reply("Send service name:");
        action_sequence.push({
          type: "get@step-2",
          data: { global_password: ctx.message.text },
        });
      } else {
        await ctx.reply("Invalid password 🚧");
      }
      break;
    }
    case "get@step-2": {
      const user = await User.findOne({ user_id: ctx.from.id });
      const encrypted_password = user.services.get(ctx.message.text);
      if (encrypted_password) {
        const decrypted_password = crypto.decrypt(
          encrypted_password,
          action.data.global_password
        );
        await ctx.reply(
          `🔐 password of ${ctx.message.text}: ${decrypted_password}`
        );
      } else {
        await ctx.reply("Service not found 🥁");
      }
      break;
    }
    case "del@step-1": {
      const user = await User.findOne({ user_id: ctx.from.id });
      if (user.services.has(ctx.message.text)) {
        user.services.delete(ctx.message.text);
        await user.save();
        await ctx.reply("Service deleted successfully 🎉");
      } else {
        await ctx.reply("Service not found 🥁");
      }
      break;
    }
    case "reset@step-1": {
      if (ctx.message.text.toLowerCase() === "yes") {
        const user = await User.findOne({ user_id: ctx.from.id });
        user.global_password = "";
        user.services = new Map();
        await user.save();
        await ctx.reply("Reset was successful 🎉");
      } else {
        await ctx.reply("Reset was canceled 🚑");
      }
      break;
    }
    default: {
      ctx.reply("Unknown command! Use /help for more information 📚");
    }
  }
});

bot.catch((err, ctx) => {
  ctx.reply("Something went wrong! Try again later!");
  console.log(err);
});

mongoose
  .connect("mongodb://localhost:27017/pwsbdb", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    bot.launch();
    console.log("Bot has started!");
  })
  .catch((err) => console.log(err));
