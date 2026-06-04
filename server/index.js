import express from 'express';
import http from 'http';
import fs from 'fs';
import cors from 'cors';
import { Server } from 'socket.io';
import { faker } from '@faker-js/faker';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "orthomed_secret_key_super_safe_2026";


const httpsServer = https.createServer(credentials, app);
const io = new Server(httpsServer, { cors: { origin: "*" } });

// ================= EMAIL CONFIG (2FA) =================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'andreisilaghi6@gmail.com', // <-- PUNE MAILUL TĂU AICI
        pass: 'chdaebobmsghxvoh'   // <-- PUNE PAROLA GALBENĂ AICI
    }
});
// ======================================================

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "x-username", "x-user-role"]
}));

app.use(express.json());

const MONGO_URI = "mongodb+srv://admin:salut123@cluster0.15v47ie.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGO_URI)
    .then(() => console.log('🍃 Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

const messageSchema = new mongoose.Schema({ sender: String, text: String, timestamp: { type: Date, default: Date.now } });
const Message = mongoose.model('Message', messageSchema);
let fakerInterval = null;

const typeDefs = `#graphql
  type Patient { id: ID!, name: String!, phone: String, appointments: [Appointment!]! }
  type SuspiciousUser { id: ID!, userId: String!, reason: String!, timestamp: String! }
  type ActionLog { id: ID!, userId: String!, role: String!, action: String!, timestamp: String! }
  type Appointment { id: ID!, patientId: ID!, date: String!, part: String!, status: String!, patient: Patient! }
  type Permission { id: ID!, action: String! }
  type Role { id: ID!, name: String!, permissions: [Permission!]! }
  
  type User { 
    id: ID!
    username: String!
    email: String!
    role: Role
    token: String
    requires2FA: Boolean! 
    message: String
  }

  type Query {
    getAllPatients: [Patient!]!
    getAllAppointments: [Appointment!]!
    getObservationList: [SuspiciousUser!]!
    getActionLogs: [ActionLog!]!
  }

  type Mutation {
    addPatient(name: String!, phone: String): Patient!
    addAppointment(patientId: ID!, date: String!, part: String!, status: String): Appointment!
    updateAppointment(id: ID!, date: String, part: String, status: String): Appointment!
    deleteAppointment(id: ID!): Boolean!
    login(identifier: String!, password: String!): User
    verify2FA(username: String!, code: String!): User
    forgotPassword(email: String!): Boolean!
    resetPassword(email: String!, code: String!, newPassword: String!): Boolean!
    register(username: String!, email: String!, password: String!, roleName: String!): User
  }
`;

async function logActionAndDetect(userId, role, action) {
    if (!userId || !role) return;
    await prisma.actionLog.create({ data: { userId, role, action } });
    if (role !== 'Admin' && action.includes('DELETE')) {
        await prisma.observationList.upsert({
            where: { userId: userId },
            update: { reason: `Unauthorized attempt: ${action}`, timestamp: new Date() },
            create: { userId: userId, reason: `Unauthorized attempt: ${action}` }
        });
    }
}

const checkAuth = (context) => {
    if (!context.user) {
        console.log("❌ Auth Blocked: Request did not provide a valid JWT Token!");
        throw new Error("Unauthorized! Token invalid or expired.");
    }
};

const resolvers = {
    Query: {
        getAllPatients: async (_, __, context) => { checkAuth(context); return await prisma.patient.findMany({ include: { appointments: true } }); },
        getAllAppointments: async (_, __, context) => { checkAuth(context); return await prisma.appointment.findMany({ include: { patient: true } }); },
        getObservationList: async (_, __, context) => { checkAuth(context); return await prisma.observationList.findMany({ orderBy: { timestamp: 'desc' } }); },
        getActionLogs: async (_, __, context) => { checkAuth(context); return await prisma.actionLog.findMany({ orderBy: { timestamp: 'desc' }, take: 100 }); }
    },

    Mutation: {
        addPatient: async (_, { name, phone }, context) => {
            checkAuth(context); // Verificăm token-ul
            await logActionAndDetect(context.user.username, context.user.role, `ADD_PATIENT: ${name}`);
            return await prisma.patient.create({ data: { name, phone } });
        },
        addAppointment: async (_, { patientId, date, part, status }, context) => {
            checkAuth(context); // Verificăm token-ul
            await logActionAndDetect(context.user.username, context.user.role, `ADD_APPOINTMENT for PATIENT: ${patientId}`);
            const newApp = await prisma.appointment.create({ data: { patientId, date, part, status: status || 'Pending' }, include: { patient: true } });
            io.emit('new-appointment', newApp);
            return newApp;
        },
        login: async (_, { identifier, password }) => {
            const user = await prisma.user.findFirst({
                where: { OR: [{ username: identifier }, { email: identifier }] },
                include: { role: { include: { permissions: true } } }
            });
            if (!user) throw new Error("Invalid credentials!");

            const valid = await bcrypt.compare(password, user.password);
            if (!valid) throw new Error("Invalid credentials!");

            // Generăm direct token-ul de acces, fără să mai trimitem cod pe mail
            const token = jwt.sign(
                { userId: user.id, username: user.username, role: user.role.name },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            console.log(`🔑 Login Direct Success! Token generated for: ${user.username}`);

            // Returnăm userul cu requires2FA setat pe false ca să sară de fereastra de cod
            return { ...user, token, requires2FA: false, message: "Login successful" };
        },
        verify2FA: async (_, { username, code }) => {
            const user = await prisma.user.findUnique({
                where: { username },
                include: { role: { include: { permissions: true } } }
            });
            if (!user || user.twoFactorCode !== code) throw new Error("Invalid or expired code!");

            await prisma.user.update({ where: { id: user.id }, data: { twoFactorCode: null } });
            const token = jwt.sign({ userId: user.id, username: user.username, role: user.role.name }, JWT_SECRET, { expiresIn: '1h' });
            console.log(`🔑 2FA Success! Token generated for: ${user.username}`);
            return { ...user, token, requires2FA: false };
        },
        forgotPassword: async (_, { email }) => {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) return true;
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            await prisma.user.update({ where: { id: user.id }, data: { resetToken: code } });
            await transporter.sendMail({
                from: '"Orthomed Security" <andreisilaghi6@gmail.com>',
                to: email,
                subject: "Orthomed Password Reset",
                text: `Your password reset code is: ${code}`
            });
            return true;
        },
        resetPassword: async (_, { email, code, newPassword }) => {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || user.resetToken !== code) throw new Error("Invalid recovery code!");
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword, resetToken: null } });
            return true;
        },
        register: async (_, {username, email, password, roleName}) => {
            if (roleName.toLowerCase() === 'admin') throw new Error("Forbidden!");
            if (!email.endsWith('@gmail.com') && !email.endsWith('@yahoo.com')) throw new Error("Invalid email domain");
            const existingUser = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
            if (existingUser) throw new Error("Taken!");

            let role = await prisma.role.findFirst({ where: { name: roleName } });
            if (!role) role = await prisma.role.create({ data: { name: roleName } });

            const hashedPassword = await bcrypt.hash(password, 10);
            return await prisma.user.create({ data: { username, email, password: hashedPassword, roleId: role.id }, include: { role: true } });
        },
        updateAppointment: async (_, { id, date, part, status }, context) => {
            checkAuth(context);
            return await prisma.appointment.update({ where: { id }, data: { date, part, status }, include: { patient: true } });
        },
        deleteAppointment: async (_, { id }, context) => {
            checkAuth(context);
            await logActionAndDetect(context.user.username, context.user.role, `DELETE_APPOINTMENT: ${id}`);
            try { await prisma.appointment.delete({where: {id}}); return true; } catch (e) { return false; }
        }
    }
};

const apolloServer = new ApolloServer({ typeDefs, resolvers });
await apolloServer.start();

app.use('/graphql', expressMiddleware(apolloServer, {
    context: async ({ req }) => {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');
        if (!token) return { user: null };
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            return { user: decoded };
        } catch (err) {
            return { user: null };
        }
    }
}));

// ================= FAKER ROUTES (FIXED) =================
app.post('/api/faker/start', (req, res) => {
    if (fakerInterval) return res.status(400).send("Running");
    console.log("🤖 Faker STARTED");

    fakerInterval = setInterval(async () => {
        try {
            const fakePatient = await prisma.patient.create({
                data: { name: faker.person.fullName(), phone: faker.phone.number() }
            });
            const parts = ['Spine', 'Left Knee', 'Right Shoulder', 'Neck', 'Right Ankle'];
            // REPARAT: Folosim doar statusurile originale solicitate
            const statuses = ['Pending', 'Confirmed', 'Canceled'];

            // REPARAT: Generăm date pe mai multe luni ale anului 2026
            const randomMonth = Math.floor(Math.random() * 8) + 5; // Generează luni între Mai (05) și Decembrie (12)
            const randomDay = Math.floor(Math.random() * 28) + 1;
            const paddedMonth = randomMonth.toString().padStart(2, '0');
            const paddedDay = randomDay.toString().padStart(2, '0');
            const fakeDate = `2026-${paddedMonth}-${paddedDay}`;

            const newApp = await prisma.appointment.create({
                data: {
                    patientId: fakePatient.id,
                    date: fakeDate,
                    part: parts[Math.floor(Math.random() * parts.length)],
                    status: statuses[Math.floor(Math.random() * statuses.length)]
                },
                include: { patient: true }
            });

            io.emit('new-appointment', newApp);
        } catch (err) { console.error(err); }
    }, 2000);

    res.send("Started");
});

app.post('/api/faker/stop', (req, res) => {
    if (fakerInterval) {
        clearInterval(fakerInterval);
        fakerInterval = null;
        console.log("🛑 Faker STOPPED");
    }
    res.send("Stopped");
});
// ========================================================

io.on('connection', (socket) => {
    socket.on('send-message', async (data) => {
        const newMessage = new Message({ sender: data.sender, text: data.text });
        await newMessage.save();
        io.emit('receive-message', newMessage);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});