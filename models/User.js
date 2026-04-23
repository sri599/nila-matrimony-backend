const mongoose = require("mongoose");

const partnerPreferenceSchema = new mongoose.Schema({
  ageFrom: Number,
ageTo: Number,
heightFrom: String,
heightTo: String,
  maritalStatus: String,
  motherTongue: String,
  physicalStatus: String,
  eatingHabits: String,
  smokingHabits: String,
  drinkingHabits: String,
  religion: String,
  caste: String,
  subcaste: String,
  star: String,
  dosham: String,
  education: String,
  employmentType: String,
  occupation: String,
  annualIncome: String,
  country: String,
  residingState: String,
  residingCity: String,
  citizenship: String,
});

const userSchema = new mongoose.Schema(
  {
    username: String,
    mobile: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
images: [
  {
    url: String,
    public_id: String,
  },
],

horoscope: {
  url: String,
  public_id: String,
},
isDeleted: {
  type: Boolean,
  default: false,
},
deletedAt: {
  type: Date,
  default: null,
},
plan: {
  type: String,
  default: null,
},

contactsLimit: {
  type: Number,
  default: 0
},
contactsUsed: {
  type: Number,
  default: 0
},
contactsRemaining: {
  type: Number,
  default: 0
},
    // 🆔 IDs
    userId: String,
    matrimonyId: String,

    // ⏱️ Activity
    lastSeen: Date,
    joinedOn: {
      type: Date,
      default: Date.now,
    },

    // 👤 Profile
    maritalStatus: String,
    profileCreatedBy: String,
    age: Number,
    height: String,
    caste: String,
    subcaste: String,
    gothram: String,
    dosham: String,
    religion: String,

    degree: String,
    workingStatus: String,
    occupation: String,

    address: String,
    pincode: String,

    isVerified: { type: Boolean, default: false },
    physicalStatus: String,
    motherTongue: String,
    eatingHabits: String,

    dob: Date,
    familyStatus: String,
    ancestralOrigin: String,
    email: String,
    gender: String,
    rasi: String,
    annualIncome: String,

    country: String,
    citizenship: String,
    residingState: String,
    residingCity: String,
    // 🧾 Personal
    about: String,
    hobbies: String,
    movies: String,
    smokingHabits: String,
    drinkingHabits: String,

    // 📱 Extra
    fcmToken: String,

    // ❤️ Preferences
    partnerPreference: partnerPreferenceSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);