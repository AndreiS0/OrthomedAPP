import { expect, test, describe } from 'vitest'

import { addAppointment, deleteAppointment, updateAppointment } from './appointmentLogic'

describe('Orthomed CRUD Logic', () => {
    const initialData = [
        { id: 1, name: "John Doe", part: "Knee" }
    ];

    test('CREATE: should add a new appointment', () => {
        const newItem = { id: 2, name: "Mary Smith", part: "Shoulder" };
        const result = addAppointment(initialData, newItem);
        expect(result).toHaveLength(2);
        expect(result[1].name).toBe("Mary Smith");
    });

    test('DELETE: should remove an appointment by ID', () => {
        const result = deleteAppointment(initialData, 1);
        expect(result).toHaveLength(0);
    });

    test('updateAppointment should update the correct item and leave others unchanged', () => {
        const initialList = [
            { id: 1, name: 'John' },
            { id: 2, name: 'Mary' }
        ];
        const updatedItem = { id: 1, name: 'John Updated' };

        const result = updateAppointment(initialList, updatedItem);

        expect(result[0].name).toBe('John Updated');
        expect(result[1].name).toBe('Mary');
    });
});