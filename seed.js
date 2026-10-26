const bcrypt = require('bcrypt');
const User = require('./models/user');
const { sequelize } = require('./config/database');

const seedUsers = [
  // Admin
  {
    name: "Admin User",
    email: "admin@example.com",
    password: "Admin@123",
    role: "admin",
    assigned_to: "admin",
    status: "active",
    firstLogin: false
  },
  // Mentors
  {
    name: "Amit Sharma",
    email: "amit@example.com",
    password: "Mentor@123",
    role: "mentor",
    assigned_to: "admin",
    status: "active",
    firstLogin: false
  },
  {
    name: "Priya Singh",
    email: "priya@example.com",
    password: "Mentor@123",
    role: "mentor",
    assigned_to: "admin",
    status: "active",
    firstLogin: false
  },
  {
    name: "Rahul Kumar",
    email: "rahul@example.com",
    password: "Mentor@123",
    role: "mentor",
    assigned_to: "admin",
    status: "active",
    firstLogin: false
  },
  {
    name: "Neha Sharma",
    email: "neha@example.com",
    password: "Mentor@123",
    role: "mentor",
    assigned_to: "admin",
    status: "active",
    firstLogin: false
  },
  {
    name: "Vikram Iyer",
    email: "vikram@example.com",
    password: "Mentor@123",
    role: "mentor",
    assigned_to: "admin",
    status: "inactive",
    firstLogin: false
  },
  // Mentees
  {
    name: "Anjali Rao",
    email: "anjali@example.com",
    password: "Mentee@123",
    role: "mentee",
    assigned_to: "Amit Sharma",
    status: "active",
    firstLogin: false
  },
  {
    name: "Dev Patel",
    email: "dev@example.com",
    password: "Mentee@123",
    role: "mentee",
    assigned_to: "Amit Sharma",
    status: "active",
    firstLogin: false
  },
  {
    name: "Tanvi Jain",
    email: "tanvi@example.com",
    password: "Mentee@123",
    role: "mentee",
    assigned_to: "Amit Sharma",
    status: "active",
    firstLogin: false
  },
  {
    name: "Sahil Khan",
    email: "sahil@example.com",
    password: "Mentee@123",
    role: "mentee",
    assigned_to: "Priya Singh",
    status: "active",
    firstLogin: false
  },
  {
    name: "Sneha Gupta",
    email: "sneha@example.com",
    password: "Mentee@123",
    role: "mentee",
    assigned_to: "Priya Singh",
    status: "active",
    firstLogin: false
  },
  {
    name: "Karan Malhotra",
    email: "karan@example.com",
    password: "Mentee@123",
    role: "mentee",
    assigned_to: "Priya Singh",
    status: "active",
    firstLogin: false
  },
  {
    name: "Pooja Desai",
    email: "pooja@example.com",
    password: "Mentee@123",
    role: "mentee",
    assigned_to: "Rahul Kumar",
    status: "active",
    firstLogin: false
  },
  {
    name: "Arjun Verma",
    email: "arjun@example.com",
    password: "Mentee@123",
    role: "mentee",
    assigned_to: "Rahul Kumar",
    status: "active",
    firstLogin: false
  },
  {
    name: "Rohit Sharma",
    email: "rohit@example.com",
    password: "Mentee@123",
    role: "mentee",
    assigned_to: "Neha Sharma",
    status: "inactive",
    firstLogin: false
  },
  {
    name: "Ritu Sen",
    email: "ritu@example.com",
    password: "Mentee@123",
    role: "mentee",
    assigned_to: "Neha Sharma",
    status: "active",
    firstLogin: false
  },
  {
    name: "Kavya Tiwari",
    email: "kavya@example.com",
    password: "Mentee@123",
    role: "mentee",
    assigned_to: "Vikram Iyer",
    status: "active",
    firstLogin: false
  },
  {
    name: "Manish Joshi",
    email: "manish@example.com",
    password: "Mentee@123",
    role: "mentee",
    assigned_to: "Vikram Iyer",
    status: "active",
    firstLogin: false
  }
];

const Task = require('./models/task');

const seedTasks = [
  {
    title: "Build Responsive TMS Dashboard UI",
    description: "Implement responsive layout with Tailwind CSS matching design specifications. Ensure sidebar is fixed and tables are scrollable.",
    mentorName: "Amit Sharma",
    mentorEmail: "amit@example.com",
    menteeName: "Anjali Rao",
    menteeEmail: "anjali@example.com",
    track: "React & Tailwind CSS",
    priority: "High",
    dueDate: "2026-10-28",
    status: "Submitted",
    submissionUrl: "https://github.com/anjali-rao/tms-dashboard-ui",
    demoUrl: "https://tms-anjali.vercel.app",
    score: null,
    feedback: "",
    mentorFeedback: "Under active review by Amit Sharma.",
    notes: "Implemented all viewports and theme toggle support.",
  },
  {
    title: "REST API Endpoint Authentication with JWT",
    description: "Set up login/register routes with bcrypt password hashing and Bearer tokens.",
    mentorName: "Amit Sharma",
    mentorEmail: "amit@example.com",
    menteeName: "Dev Patel",
    menteeEmail: "dev@example.com",
    track: "Backend (Node & Express)",
    priority: "High",
    dueDate: "2026-10-30",
    status: "Submitted",
    submissionUrl: "https://github.com/dev-patel/auth-service-jwt",
    demoUrl: "",
    score: null,
    feedback: "",
    mentorFeedback: "",
    notes: "Completed middleware and route protection.",
  },
  {
    title: "MongoDB Aggregation Pipeline for Analytics",
    description: "Write queries to aggregate monthly intern hours and project status counts.",
    mentorName: "Amit Sharma",
    mentorEmail: "amit@example.com",
    menteeName: "Tanvi Jain",
    menteeEmail: "tanvi@example.com",
    track: "Fullstack (MERN)",
    priority: "Medium",
    dueDate: "2026-10-25",
    status: "Completed",
    submissionUrl: "https://github.com/tanvi-j/mongo-analytics",
    demoUrl: "",
    score: 95,
    feedback: "Exceptional indexing optimization and clean aggregation stages. Well done!",
    mentorFeedback: "Exceptional indexing optimization and clean aggregation stages. Well done!",
    notes: "Pipeline tested with 10k mock documents.",
  },
  {
    title: "State Management with Context API & Reducers",
    description: "Refactor global authentication state and user preference toggles using React createContext and useReducer.",
    mentorName: "Amit Sharma",
    mentorEmail: "amit@example.com",
    menteeName: "Anjali Rao",
    menteeEmail: "anjali@example.com",
    track: "React Architecture",
    priority: "High",
    dueDate: "2026-10-20",
    status: "Completed",
    submissionUrl: "https://github.com/anjali-rao/context-api-demo",
    demoUrl: "https://anjali-state.vercel.app",
    score: 96,
    feedback: "Excellent modular structure! Clean separation of concerns.",
    mentorFeedback: "Excellent modular structure! Clean separation of concerns.",
    notes: "Includes unit tests for reducer handlers.",
  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("Database connected for seeding...");

    await sequelize.sync();

    for (const u of seedUsers) {
      const existing = await User.findOne({ where: { email: u.email.toLowerCase() } });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await User.create({
          name: u.name,
          email: u.email.toLowerCase(),
          password: hashedPassword,
          role: u.role,
          assigned_to: u.assigned_to,
          status: u.status,
          firstLogin: u.firstLogin
        });
        console.log(`Seeded user: ${u.email} (${u.role})`);
      } else {
        console.log(`User already exists: ${u.email}`);
      }
    }

    const taskCount = await Task.count();
    if (taskCount === 0) {
      for (const t of seedTasks) {
        await Task.create(t);
        console.log(`Seeded task: "${t.title}" for ${t.menteeName}`);
      }
    } else {
      console.log(`Tasks table already contains ${taskCount} tasks.`);
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
