const admin = require("../config/firebase");

function sendPushNotification({ token, title, body }) {
  if (!token) return;

  const message = {
    token,
    notification: { title, body },
    android: {
      priority: "high",
      notification: {
        channelId: "order_channel",
        sound: "order_alarm",
      },
    },
  };

  admin.messaging().send(message)
    .then(res => {
      console.log("✅ Push sent:", res);
    })
    .catch(err => {
      console.error("❌ Push error:", err.message);
    });
}

module.exports = sendPushNotification;