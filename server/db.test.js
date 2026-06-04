import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';

// 1. Creăm un "fals" Prisma Client
const prismaMock = mockDeep();

// 2. Simulăm resolvers-urile exact cum sunt în index.js, dar folosind "falsul"
const resolvers = {
    Query: {
        getAllPatients: async () => await prismaMock.patient.findMany({ include: { appointments: true } }),
    },
    Mutation: {
        addPatient: async (_, { name, phone }) => {
            return await prismaMock.patient.create({ data: { name, phone } });
        },
        deleteAppointment: async (_, { id }) => {
            try {
                await prismaMock.appointment.delete({ where: { id } });
                return true;
            } catch (error) {
                return false;
            }
        }
    }
};

describe('Database CRUD Operations (Bronze Challenge)', () => {

    // Înainte de fiecare test, golim "memoria" bazei de date simulate
    beforeEach(() => {
        mockReset(prismaMock);
    });

    it('CREATE: should add a new patient to the database', async () => {
        // Datele de test
        const newPatient = { id: 'p1', name: 'John Doe', phone: '123456789' };

        // Îi spunem mock-ului ce să răspundă când e apelat "create"
        prismaMock.patient.create.mockResolvedValue(newPatient);

        const result = await resolvers.Mutation.addPatient(null, { name: 'John Doe', phone: '123456789' });

        expect(result).toEqual(newPatient);
        // Verificăm dacă Prisma a fost chemată o singură dată
        expect(prismaMock.patient.create).toHaveBeenCalledTimes(1);
    });

    it('READ: should fetch all patients from the database', async () => {
        const mockPatients = [
            { id: 'p1', name: 'John', appointments: [] },
            { id: 'p2', name: 'Mary', appointments: [] }
        ];

        prismaMock.patient.findMany.mockResolvedValue(mockPatients);

        const result = await resolvers.Query.getAllPatients();

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('John');
        expect(prismaMock.patient.findMany).toHaveBeenCalledWith({ include: { appointments: true } });
    });

    it('DELETE: should return true when deleting an existing appointment', async () => {
        // Simulăm că ștergerea a funcționat (returnează obiectul șters)
        prismaMock.appointment.delete.mockResolvedValue({ id: 'app1' });

        const result = await resolvers.Mutation.deleteAppointment(null, { id: 'app1' });

        expect(result).toBe(true);
        expect(prismaMock.appointment.delete).toHaveBeenCalledWith({ where: { id: 'app1' } });
    });

    it('DELETE: should return false when trying to delete a non-existent appointment', async () => {
        // Simulăm că baza de date aruncă o eroare (nu a găsit ID-ul)
        prismaMock.appointment.delete.mockRejectedValue(new Error('Record not found'));

        const result = await resolvers.Mutation.deleteAppointment(null, { id: 'invalid-id' });

        expect(result).toBe(false);
    });
});