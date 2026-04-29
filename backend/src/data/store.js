const users = [
  { id: "mem-admin", username: "admin", password: "1234", role: "admin" },
  { id: "mem-agent", username: "agent", password: "1234", role: "sales" },
  { id: "mem-customer", username: "customer", password: "1234", role: "customer" },
];

const leads = [
  {
    id: 1,
    name: "Vikas",
    interest: "Looking for a premium apartment close to the central business district.",
    budget: 5000000,
    visits: 5,
    timeSpent: 20,
    urgencyScore: 9,
    score: 90,
    status: "Qualified",
    location: "Delhi",
    source: "Website",
    industry: "Residential",
    tag: "Hot",
    notes: [
      {
        id: 1,
        text: "Requested premium options near central business district.",
        createdAt: "2025-04-01T10:00:00.000Z",
      },
    ],
    date: "2025-04-01",
    converted: 1,
    createdBy: "mem-admin",
    assignedTo: "mem-agent",
  },
  {
    id: 2,
    name: "Rahul",
    interest: "Needs office space with quick possession for a growing team.",
    budget: 2000000,
    visits: 2,
    timeSpent: 10,
    urgencyScore: 5,
    score: 60,
    status: "New",
    location: "Mumbai",
    source: "Facebook",
    industry: "Commercial",
    tag: "Warm",
    notes: [
      {
        id: 1,
        text: "Interested in office space with quick possession.",
        createdAt: "2025-04-05T11:00:00.000Z",
      },
    ],
    date: "2025-04-05",
    converted: 0,
    createdBy: "mem-admin",
    assignedTo: "mem-agent",
  },
];

const leadScores = [];
const activityLogs = [];

function getUsers() {
  return users;
}

function getLeads() {
  return leads;
}

function replaceLeads(nextLeads) {
  leads.splice(0, leads.length, ...nextLeads);
}

function getLeadScores() {
  return leadScores;
}

function getActivityLogs() {
  return activityLogs;
}

function getNextLeadId() {
  return leads.length ? Math.max(...leads.map((lead) => Number(lead.id))) + 1 : 1;
}

module.exports = {
  getUsers,
  getLeads,
  replaceLeads,
  getLeadScores,
  getActivityLogs,
  getNextLeadId,
};
