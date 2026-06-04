
export const addAppointment = (list, newItem) => [...list, newItem];

export const deleteAppointment = (list, id) => list.filter(app => app.id !== id);

export const updateAppointment = (list, updatedItem) =>
    list.map(app => app.id === updatedItem.id ? updatedItem : app);