const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Lead = require("../models/Lead");
const { replaceLeads, getUsers } = require("../data/store");
const { buildCsvLeads } = require("./csvLeadService");

function seedInMemoryLeadsFromCsv() {
  const users = getUsers();
  const admin = users.find((user) => user.username === "admin");
  const agent = users.find((user) => user.username === "agent");

  replaceLeads(
    buildCsvLeads({
      createdBy: admin?.username || null,
      assignedTo: agent?.username || null,
    })
  );
}

async function seedDatabaseIfNeeded() {
  const userCount = await User.countDocuments();

  if (userCount > 0) {
    const leadCount = await Lead.countDocuments();

    if (leadCount === 0) {
      const admin = await User.findOne({ username: "admin" });
      const agent = await User.findOne({ username: "agent" });
      await Lead.create(
        buildCsvLeads({
          createdBy: admin?._id,
          assignedTo: agent?._id,
        }).map(({ id, ...lead }) => lead)
      );
    }

    return;
  }

  const [adminPassword, agentPassword] = await Promise.all([
    bcrypt.hash("1234", 10),
    bcrypt.hash("1234", 10),
  ]);

  const [admin, agent] = await User.create([
    { username: "admin", passwordHash: adminPassword, role: "admin" },
    { username: "agent", passwordHash: agentPassword, role: "sales" },
  ]);

  await Lead.create(
    buildCsvLeads({
      createdBy: admin._id,
      assignedTo: agent._id,
    }).map(({ id, ...lead }) => lead)
  );
}

module.exports = {
  seedDatabaseIfNeeded,
  seedInMemoryLeadsFromCsv,
};
